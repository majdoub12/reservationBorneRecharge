const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const OCR_SERVER_URL = process.env.OCR_SERVER_URL || 'http://127.0.0.1:8000/ocr/vehicle-document';

exports.handleOCR = [
  upload.single('image'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname || 'image.jpg',
        contentType: req.file.mimetype || 'image/jpeg'
      });

      const ocrResponse = await axios.post(OCR_SERVER_URL, formData, {
        headers: formData.getHeaders(),
        timeout: 30000
      });

      const ocrData = ocrResponse.data?.data || {};
      const immatricul = ocrData.immatriculation || ocrData.immatricul || '';
      const vin = ocrData.chassis || ocrData.vin || '';

      return res.json({
        immatricul,
        vin,
        raw: ocrData.raw_ocr || null,
        success: true
      });
    } catch (err) {
      console.error('OCR server error:', err.response?.data || err.message);
      const status = err.response?.status || 500;
      const message = err.response?.data?.detail || err.response?.data?.message || 'OCR service failed';

      return res.status(status).json({
        message,
        error: err.message
      });
    }
  }
];
