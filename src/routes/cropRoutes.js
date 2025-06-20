const express = require('express');
const multer = require('multer');
const CropService = require('../services/cropService');

const router = express.Router();
const cropService = new CropService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

/**
 * POST /api/crop/simple
 * Simple rectangular crop
 */
router.post('/simple', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { x = 0, y = 0, width = 100, height = 100 } = req.body;
    
    const cropArea = {
      x: parseInt(x),
      y: parseInt(y),
      width: parseInt(width),
      height: parseInt(height)
    };

    const resultBuffer = await cropService.simpleCrop(req.file.buffer, cropArea);

    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': 'attachment; filename="cropped-image.png"'
    });

    res.send(resultBuffer);

  } catch (error) {
    console.error('Crop processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crop/test
 * Test endpoint
 */
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Crop service is working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
