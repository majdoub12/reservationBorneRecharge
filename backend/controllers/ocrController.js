const multer = require('multer');
const axios = require('axios');
const sharp = require('sharp');
const FormData = require('form-data');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

async function callRoboflow(imageBuffer, mimeType) {
  const roboflowUrl = `https://detect.roboflow.com/card-fields-extraction-final/1?api_key=${process.env.ROBOFLOW_API_KEY}`;

  try {
    console.log(`Trying Roboflow with binary upload (${mimeType || 'application/octet-stream'})...`);
    return await axios.post(roboflowUrl, imageBuffer, {
      headers: {
        'Content-Type': mimeType || 'application/octet-stream'
      }
    });
  } catch (binaryError) {
    console.warn('Binary Roboflow request failed, retrying with base64 payload:', binaryError.response?.data || binaryError.message);

    const base64Image = imageBuffer.toString('base64');
    return axios.post(roboflowUrl, base64Image, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }
}

async function preprocessForOCR(imageBuffer, options = {}) {
  const {
    width,
    height,
    fit = 'fill',
    grayscale = true,
    thresholdValue = 155,
    sharpen = true
  } = options;

  let pipeline = sharp(imageBuffer)
    .normalize()
    .modulate({ brightness: 1.1, saturation: 0 });

  if (grayscale) {
    pipeline = pipeline.grayscale();
  }

  if (width || height) {
    pipeline = pipeline.resize(width, height, { fit });
  }

  if (sharpen) {
    pipeline = pipeline.sharpen();
  }

  if (typeof thresholdValue === 'number') {
    pipeline = pipeline.threshold(thresholdValue);
  }

  return pipeline.jpeg({ quality: 92 }).toBuffer();
}

async function recognizeWithEasyOCR(imageBuffer, mode = 'generic') {
  try {
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'image.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('mode', mode);

    const response = await axios.post('http://127.0.0.1:8000/ocr', formData, {
      headers: formData.getHeaders(),
      timeout: 15000
    });

    return response.data?.results || [];
  } catch (error) {
    console.error('EasyOCR error:', error.response?.data || error.message);
    return [];
  }
}

async function recognizeWithFallback(imageBuffer, modes) {
  for (const mode of modes) {
    const results = await recognizeWithEasyOCR(imageBuffer, mode);
    if (results.length > 0) {
      return results;
    }
  }

  return [];
}

function getResultLeft(result) {
  const bbox = Array.isArray(result?.bbox) ? result.bbox : [];
  if (!bbox.length) return Number.MAX_SAFE_INTEGER;
  return Math.min(...bbox.map(point => Array.isArray(point) ? point[0] : Number.MAX_SAFE_INTEGER));
}
function combineOCRResults(results, className) {
  if (!results.length) {
    return { text: '', confidence: 0 };
  }

  const ordered = [...results].sort((a, b) => getResultLeft(a) - getResultLeft(b));
  const confidence = ordered.reduce((sum, item) => sum + (item.confidence || 0), 0) / ordered.length;

  if (className === 'vin') {
    const text = ordered
      .map(item => (item.text || '').toUpperCase()
        .replace(/,/g, 'V')
        .replace(/\|/g, 'Y')
        .replace(/\(/g, 'C')
        .replace(/\)/g, '')
        .replace(/\./g, '')
        .replace(/[^A-Z0-9]/g, '')
      )
      .join('');
    return { text, confidence };
  }

  if (className === 'plate') {
    const text = ordered
      .map(item => (item.text || '').toUpperCase())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { text, confidence };
  }

  const best = ordered.reduce((prev, curr) =>
    (prev.confidence || 0) > (curr.confidence || 0) ? prev : curr
  );

  return {
    text: (best.text || '').trim().toUpperCase(),
    confidence: best.confidence || 0
  };
}

async function runOCRVariants(variants, modes, className) {
  let best = { text: '', confidence: 0 };

  for (const variant of variants) {
    const results = await recognizeWithFallback(variant, modes);
    const combined = combineOCRResults(results, className);

    if (!combined.text) {
      continue;
    }

    if (className === 'vin') {
      if (
        combined.text.length > best.text.length ||
        (combined.text.length === best.text.length && combined.confidence > best.confidence)
      ) {
        best = combined;
      }
      continue;
    }

    const score = (combined.text.match(/\d/g) || []).length;
    const bestScore = (best.text.match(/\d/g) || []).length;
    if (score > bestScore || (score === bestScore && combined.confidence > best.confidence)) {
      best = combined;
    }
  }

  return best;
}

async function extractVerticalPlateText(croppedBuffer) {
  const meta = await sharp(croppedBuffer).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  if (!width || !height) return '';

  console.log(`Vertical plate: ${width}x${height}`);

  const topHeight = Math.floor(height * 0.45);
  const bottomStart = Math.floor(height * 0.60);

  const topRegion = await sharp(croppedBuffer)
    .extract({ left: 0, top: 0, width, height: topHeight })
    .toBuffer();

  const bottomRegion = await sharp(croppedBuffer)
    .extract({ left: 0, top: bottomStart, width, height: height - bottomStart })
    .toBuffer();

  const [preparedTopSoft, preparedTopHard, preparedBottomSoft, preparedBottomHard] = await Promise.all([
    preprocessForOCR(topRegion, {
      width: 220,
      height: 120,
      thresholdValue: null
    }),
    preprocessForOCR(topRegion, {
      width: 220,
      height: 120,
      thresholdValue: 130
    }),
    preprocessForOCR(bottomRegion, {
      width: 260,
      height: 120,
      thresholdValue: null
    }),
    preprocessForOCR(bottomRegion, {
      width: 260,
      height: 120,
      thresholdValue: 130
    })
  ]);

  const [topResults, bottomResults] = await Promise.all([
    runOCRVariants([preparedTopSoft, preparedTopHard], ['plate_digits', 'generic'], 'plate'),
    runOCRVariants([preparedBottomSoft, preparedBottomHard], ['plate_digits', 'generic'], 'plate')
  ]);

  const topDigits = (topResults.text || '').replace(/[^\d]/g, '');
  const bottomDigits = (bottomResults.text || '').replace(/[^\d]/g, '');

  console.log('Vertical plate extraction:', { topDigits, bottomDigits });

  if (topDigits && bottomDigits) {
    return `${topDigits} TUN ${bottomDigits}`;
  }

  if (topDigits) {
    return topDigits;
  }

  if (bottomDigits) {
    return bottomDigits;
  }

  return '';
}

async function processDetection(imageBuffer, box, className, imageWidth, imageHeight) {
  try {
    let x = Math.max(0, box.x - box.width / 2);
    let y = Math.max(0, box.y - box.height / 2);
    let width = Math.min(box.width, imageWidth - x);
    let height = Math.min(box.height, imageHeight - y);

    console.log(`Initial ${className} bbox:`, {
      x: Math.floor(x),
      y: Math.floor(y),
      width: Math.floor(width),
      height: Math.floor(height)
    });

    if (className === 'plate') {
      const padding = 20;

      x = Math.max(0, x - padding);
      y = Math.max(0, y - padding);
      width = Math.min(width + padding * 2, imageWidth - x);
      height = Math.min(height + padding * 2, imageHeight - y);

      console.log('Padded plate bbox:', {
        x: Math.floor(x),
        y: Math.floor(y),
        width: Math.floor(width),
        height: Math.floor(height)
      });
    }

    if (width <= 0 || height <= 0) {
      throw new Error('Invalid crop dimensions');
    }

    let cropped = await sharp(imageBuffer)
      .extract({
        left: Math.floor(x),
        top: Math.floor(y),
        width: Math.floor(width),
        height: Math.floor(height)
      })
      .toBuffer();

    if (process.env.OCR_DEBUG_IMAGES === 'true') {
      await sharp(cropped).toFile(`debug_${className}.jpg`);
    }

    if (className === 'plate') {
      const isVerticalPlate = height > width * 1.5;

      console.log(`Plate is vertical: ${isVerticalPlate} (${Math.floor(width)}x${Math.floor(height)})`);

      if (isVerticalPlate) {
        const text = await extractVerticalPlateText(cropped);
        return {
          class: className,
          text,
          confidence: box.confidence,
          ocrConfidence: null
        };
      }

      const [plateSoft, plateHard] = await Promise.all([
        preprocessForOCR(cropped, {
          width: 400,
          height: 200,
          thresholdValue: null
        }),
        preprocessForOCR(cropped, {
          width: 400,
          height: 200,
          thresholdValue: 145
        })
      ]);

      const plateOCR = await runOCRVariants([plateSoft, plateHard], ['plate', 'generic'], 'plate');

      console.log(`EasyOCR ${className}: "${plateOCR.text}"`);

      return {
        class: className,
        text: plateOCR.text,
        confidence: box.confidence,
        ocrConfidence: plateOCR.confidence
      };
    }

    if (className === 'vin') {
  const [vinSoft, vinHard, vinInverted, vinInvertedHard] = await Promise.all([
    // Variant 1: normalize + contrast boost, no threshold
    sharp(cropped)
      .grayscale()
      .normalize()
      .linear(1.8, -40)
      .sharpen({ sigma: 1.2 })
      .resize(800, 160, { fit: 'fill' })
      .jpeg({ quality: 95 })
      .toBuffer(),

    // Variant 2: aggressive contrast + threshold
    sharp(cropped)
      .grayscale()
      .normalize()
      .linear(2.0, -60)
      .sharpen({ sigma: 1.0 })
      .resize(800, 160, { fit: 'fill' })
      .threshold(120)
      .jpeg({ quality: 95 })
      .toBuffer(),

    // Variant 3: inverted colors, soft
    sharp(cropped)
      .grayscale()
      .normalize()
      .linear(1.8, -40)
      .negate()
      .sharpen({ sigma: 1.2 })
      .resize(800, 160, { fit: 'fill' })
      .jpeg({ quality: 95 })
      .toBuffer(),

    // Variant 4: inverted colors, hard threshold
    sharp(cropped)
      .grayscale()
      .normalize()
      .linear(2.0, -60)
      .negate()
      .threshold(120)
      .resize(800, 160, { fit: 'fill' })
      .jpeg({ quality: 95 })
      .toBuffer(),
  ]);

  const vinOCR = await runOCRVariants(
    [vinSoft, vinHard, vinInverted, vinInvertedHard],
    ['generic', 'vin'],
    'vin'
  );

  console.log(`EasyOCR ${className}: "${vinOCR.text}"`);

  return {
    class: className,
    text: vinOCR.text,
    confidence: box.confidence,
    ocrConfidence: vinOCR.confidence
  };
}

    return {
      class: className,
      text: '',
      confidence: box.confidence,
      ocrConfidence: 0
    };
  } catch (error) {
    console.error(`Error processing ${className}:`, error.message);
    throw error;
  }
}

function cleanPlateText(text) {
  console.log('Raw plate text:', JSON.stringify(text));

  const normalized = text
    .replace(/TUN/gi, ' TUN ')
    .replace(/[^\dA-Z\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  const digitGroups = normalized.match(/\d+/g) || [];
  console.log('Extracted number groups:', digitGroups);

  if (normalized.includes('TUN') && digitGroups.length >= 2) {
    return `${digitGroups[0]} TUN ${digitGroups[digitGroups.length - 1]}`;
  }

  if (digitGroups.length >= 2) {
    const firstNum = digitGroups[0];
    const lastNum = digitGroups[digitGroups.length - 1];

    if (firstNum.length >= 3 && lastNum.length >= 2) {
      return `${firstNum} TUN ${lastNum}`;
    }
  }

  if (digitGroups.length === 1 && digitGroups[0].length >= 3) {
    return digitGroups[0];
  }

  return '';
}

function cleanVinText(text) {
  let cleaned = text
    .toUpperCase()
    .replace(/,/g, 'V')
    .replace(/\|/g, 'Y')
    .replace(/\(/g, 'C')
    .replace(/\)/g, '')
    .replace(/\./g, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim();

  // VIN standard forbids I, O, Q
  cleaned = cleaned
    .replace(/O/g, '0')
    .replace(/Q/g, '0');
  // Note: do NOT replace I→1 blindly, Y is already handled above

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
      const metadata = await sharp(req.file.buffer).metadata();
      const imageWidth = metadata.width;
      const imageHeight = metadata.height;

      console.log(`Image dimensions: ${imageWidth}x${imageHeight}`);
      console.log('Calling Roboflow API...');
      const roboflowResponse = await callRoboflow(req.file.buffer, req.file.mimetype);

      console.log('Roboflow response received');
      const predictions = roboflowResponse.data?.predictions || [];

      if (!predictions.length) {
        return res.json({
          immatricul: '',
          vin: '',
          message: 'No plate or VIN detected'
        });
      }

      console.log(`Found ${predictions.length} detection(s)`);

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

      console.log(`Filtered: ${plateBoxes.length} plate(s), ${vinBoxes.length} VIN(s)`);

      const ocrPromises = [];

      if (plateBoxes.length > 0) {
        const bestPlate = plateBoxes.reduce((prev, current) =>
          prev.confidence > current.confidence ? prev : current
        );

        ocrPromises.push(
          processDetection(req.file.buffer, bestPlate, 'plate', imageWidth, imageHeight)
            .catch(err => {
              console.error('Plate OCR error:', err.message);
              return { class: 'plate', text: '', error: err.message };
            })
        );
      }

      if (vinBoxes.length > 0) {
        const bestVin = vinBoxes.reduce((prev, current) =>
          prev.confidence > current.confidence ? prev : current
        );

        ocrPromises.push(
          processDetection(req.file.buffer, bestVin, 'vin', imageWidth, imageHeight)
            .catch(err => {
              console.error('VIN OCR error:', err.message);
              return { class: 'vin', text: '', error: err.message };
            })
        );
      }

      const ocrResults = await Promise.all(ocrPromises);
      console.log('OCR Results:', ocrResults);

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

      console.log('Final OCR results:', { plate, vin });

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
      console.error('OCR error:', err.response?.data || err.message);
      res.status(500).json({
        message: 'OCR failed',
        error: err.message
      });
    }
  }
];
