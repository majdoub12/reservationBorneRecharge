const multer = require('multer');
const Tesseract = require('tesseract.js');
const axios = require('axios');
const sharp = require('sharp');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

async function processDetection(imageBuffer, box, className, imageWidth, imageHeight) {
  try {
    let x = Math.max(0, box.x - box.width / 2);
    let y = Math.max(0, box.y - box.height / 2);
    let width = Math.min(box.width, imageWidth - x);
    let height = Math.min(box.height, imageHeight - y);

    console.log(`🔄 Initial ${className} bbox:`, {
      x: Math.floor(x),
      y: Math.floor(y),
      width: Math.floor(width),
      height: Math.floor(height)
    });

    // 🔹 FOR PLATE: If vertical (height >> width), enlarge width
    if (className === 'plate' && height > width * 3) {
      console.log('📐 Detected vertical plate, enlarging width...');
      
      // Double or triple the width
      const newWidth = Math.min(width * 3, imageWidth - x);
      const centerX = x + width / 2;
      
      x = Math.max(0, centerX - newWidth / 2);
      width = Math.min(newWidth, imageWidth - x);
      
      console.log(`✅ Enlarged ${className} bbox:`, {
        x: Math.floor(x),
        y: Math.floor(y),
        width: Math.floor(width),
        height: Math.floor(height)
      });
    }

    if (width <= 0 || height <= 0) {
      throw new Error('Invalid crop dimensions');
    }

    // 🔹 Crop image
    let cropped = await sharp(imageBuffer)
      .extract({
        left: Math.floor(x),
        top: Math.floor(y),
        width: Math.floor(width),
        height: Math.floor(height)
      })
      .toBuffer();

    // 🔹 For plate: Rotate if vertical
    if (className === 'plate') {
      const meta = await sharp(cropped).metadata();
      
      if (meta.height > meta.width) {
        console.log('🔄 Rotating plate 90 degrees...');
        cropped = await sharp(cropped)
          .rotate(90)
          .resize(400, 100, { fit: 'fill' })
          .threshold(120)
          .toBuffer();
      } else {
        cropped = await sharp(cropped)
          .resize(300, 300, { fit: 'fill' })
          .threshold(120)
          .toBuffer();
      }
    }

    // 🔹 For VIN: Resize
    if (className === 'vin') {
      cropped = await sharp(cropped)
        .resize(400, 100, { fit: 'fill' })
        .toBuffer();
    }

    // 🔹 Run Tesseract
    let result;
    
    if (className === 'plate') {
      result = await Tesseract.recognize(cropped, 'eng', {
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZTN',
      });
    } else {
      result = await Tesseract.recognize(cropped, 'eng', {
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      });
    }

    const { data: { text, confidence } } = result;
    let cleanedText = text.trim().toUpperCase();

    console.log(`✅ Raw ${className} OCR: "${cleanedText}"`);

    return {
      class: className,
      text: cleanedText,
      confidence: box.confidence,
      tesseractConfidence: confidence
    };

  } catch (error) {
    console.error(`Error processing ${className}:`, error.message);
    throw error;
  }
}


function cleanPlateText(text) {
  console.log('🔍 Raw plate text:', JSON.stringify(text));
  
  // 🔹 Remove ALL non-numeric characters (letters, Arabic, special chars)
  let cleaned = text.replace(/[^\d\s]/g, '');  // Keep ONLY digits and spaces
  console.log('✅ After removing non-digits:', JSON.stringify(cleaned));
  
  // 🔹 Extract numbers
  const numbers = cleaned.trim().split(/\s+/).filter(n => n.length > 0 && /^\d+$/.test(n));
  console.log('✅ Extracted numbers:', numbers);
  
  // 🔹 Format: NUMERO1 TUN NUMERO2
  // Cherche le PREMIER et le DERNIER nombre
  if (numbers.length >= 2) {
    const firstNum = numbers[0];
    const lastNum = numbers[numbers.length - 1];
    
    // Vérifie que c'est des vrais numéros (pas trop petits)
    if (firstNum.length >= 3 && lastNum.length >= 2) {
      return `${firstNum} TUN ${lastNum}`;
    }
  }
  
  return '';
}


// ─── Helper: Clean VIN text ──────────────────────────────────────────────────
function cleanVinText(text) {
  // Remove everything except letters and numbers
  let cleaned = text.replace(/[^A-Z0-9]/g, '').trim();
  
  // Common OCR mistakes for VIN (more aggressive, VIN is standardized)
  cleaned = cleaned
    .replace(/O/g, '0')   // O -> 0
    .replace(/I/g, '1')   // I -> 1
    .replace(/Z/g, '2')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/G/g, '6');
  
  // VIN should be 17 characters
  if (cleaned.length > 17) {
    cleaned = cleaned.substring(0, 17);
  }
  
  return cleaned;
}



exports.handleOCR = [
  upload.single('image'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
 
    try {
      // 🔹 Step 1: Get image metadata
      const metadata = await sharp(req.file.buffer).metadata();
      const imageWidth = metadata.width;
      const imageHeight = metadata.height;
 
      console.log(`📸 Image dimensions: ${imageWidth}x${imageHeight}`);
 
      // 🔹 Step 2: Convert to base64
      const base64Image = req.file.buffer.toString('base64');
 
      // 🔹 Step 3: Call Roboflow
      const roboflowUrl = `https://detect.roboflow.com/card-fields-extraction-final/1?api_key=${process.env.ROBOFLOW_API_KEY}`;
 
      console.log('🚀 Calling Roboflow API...');
 
      const roboflowResponse = await axios.post(
        roboflowUrl,
        req.file.buffer,  // Send buffer directly, not base64
        {
          headers: {
            'Content-Type': 'image/jpeg'  // Or image/png depending on input
          }
        }
      );
 
      console.log('✅ Roboflow response received');
      const predictions = roboflowResponse.data?.predictions || [];
 
      if (!predictions.length) {
        return res.json({
          immatricul: '',
          vin: '',
          message: 'No plate or VIN detected'
        });
      }
 
      console.log(`📍 Found ${predictions.length} detection(s)`);
 
      // 🔹 Step 4: Filter plate and vin (Tunisian classes)
      const plateBoxes = predictions.filter(p =>
        p.class.toLowerCase() === 'mat' ||
        p.class.toLowerCase() === 'plate' ||
        p.class.toLowerCase() === 'matricule'
      );
 
      const vinBoxes = predictions.filter(p =>
        p.class.toLowerCase() === 'num_serie' ||
        p.class.toLowerCase() === 'vin' ||
        p.class.toLowerCase() === 'chassis_number'
      );
 
      console.log(`📍 Filtered: ${plateBoxes.length} plate(s), ${vinBoxes.length} VIN(s)`);
 
      // 🔹 Step 5: OCR for each detection
      const ocrPromises = [];
 
      // Process plates (take the one with highest confidence)
      if (plateBoxes.length > 0) {
        const bestPlate = plateBoxes.reduce((prev, current) =>
          (prev.confidence > current.confidence) ? prev : current
        );
        
        ocrPromises.push(
          processDetection(req.file.buffer, bestPlate, 'plate', imageWidth, imageHeight)
            .catch(err => {
              console.error(`❌ Plate OCR error:`, err.message);
              return { class: 'plate', text: '', error: err.message };
            })
        );
      }
 
      // Process VINs (take the one with highest confidence)
      if (vinBoxes.length > 0) {
        const bestVin = vinBoxes.reduce((prev, current) =>
          (prev.confidence > current.confidence) ? prev : current
        );
        
        ocrPromises.push(
          processDetection(req.file.buffer, bestVin, 'vin', imageWidth, imageHeight)
            .catch(err => {
              console.error(`❌ VIN OCR error:`, err.message);
              return { class: 'vin', text: '', error: err.message };
            })
        );
      }
 
      const ocrResults = await Promise.all(ocrPromises);
      console.log('📝 OCR Results:', ocrResults);
 
      // 🔹 Step 6: Extract results
      let plate = '';
      let vin = '';
      let plateConfidence = 0;
      let vinConfidence = 0;
 
      ocrResults.forEach(result => {
        const className = result.class.toLowerCase();
        if (className === 'plate' && result.text) {
          plate = cleanPlateText(result.text);
          plateConfidence = result.confidence || 0;
        }
        if (className === 'vin' && result.text) {
          vin = cleanVinText(result.text);
          vinConfidence = result.confidence || 0;
        }
      });
 
      console.log('✅ Final OCR results:', { plate, vin });
 
      res.json({
        immatricul: plate,
        vin: vin,
        confidence: {
          plate: plateConfidence,
          vin: vinConfidence
        },
        debug: {
          detections: predictions.length,
          plate_detections: plateBoxes.length,
          vin_detections: vinBoxes.length
        }
      });
 
    } catch (err) {
      console.error('❌ OCR error:', err.response?.data || err.message);
      res.status(500).json({
        message: 'OCR failed',
        error: err.message
      });
    }
  }
];