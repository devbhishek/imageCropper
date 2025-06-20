const sharp = require('sharp');

class CropService {
  constructor() {
    this.supportedFormats = ['png', 'jpg', 'jpeg', 'webp'];
  }

  /**
   * Simple crop function using Sharp (we'll enhance this later)
   * @param {Buffer} imageBuffer - Input image buffer
   * @param {Object} cropArea - {x, y, width, height}
   * @returns {Buffer} - Processed image buffer
   */
  async simpleCrop(imageBuffer, cropArea) {
    try {
      const { x, y, width, height } = cropArea;
      
      const result = await sharp(imageBuffer)
        .extract({ 
          left: Math.round(x), 
          top: Math.round(y), 
          width: Math.round(width), 
          height: Math.round(height) 
        })
        .png()
        .toBuffer();

      return result;
    } catch (error) {
      throw new Error(`Crop processing failed: ${error.message}`);
    }
  }

  /**
   * Add transparency to image outside a rectangular area
   */
  async cropWithTransparency(imageBuffer, cropArea) {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      // Create a mask
      const mask = await sharp({
        create: {
          width: metadata.width,
          height: metadata.height,
          channels: 1,
          background: { r: 0, g: 0, b: 0 }
        }
      })
      .png()
      .toBuffer();

      // For now, just return the original with PNG format for transparency support
      const result = await sharp(imageBuffer)
        .png()
        .toBuffer();

      return result;
    } catch (error) {
      throw new Error(`Transparency processing failed: ${error.message}`);
    }
  }
}

module.exports = CropService;
