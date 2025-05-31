const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { config } = require('../config/config');

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = [
    path.resolve(__dirname, config.fileUpload.tempDir),
    path.resolve(__dirname, config.fileUpload.processedDir)
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initialize upload directories
ensureUploadDirs();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, config.fileUpload.tempDir));
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `resume-${uniqueSuffix}${ext}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check MIME type using config
  const allowedMimeTypes = [
    ...config.fileUpload.allowedTypes,
    'image/tiff',
    'image/gif', 
    'image/webp',
    'text/plain' // Allow text files for testing
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: PDF, DOC, DOCX, JPG, PNG, TIFF, GIF, WEBP`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.fileUpload.maxFileSize,
    files: 1 // Single file upload
  }
});

// Enhanced file validation middleware
const validateFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get file extension from original filename
    const fileExt = path.extname(req.file.originalname).toLowerCase().slice(1);
    
    // Validate file extension
    const allowedExtensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'tiff', 'gif', 'webp', 'txt'];
    if (!allowedExtensions.includes(fileExt)) {
      // Remove uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: `Invalid file extension: ${fileExt}. Allowed types: ${allowedExtensions.join(', ')}`
      });
    }

    // Additional MIME type validation
    const validMimeTypes = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'tiff': 'image/tiff',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'txt': 'text/plain'
    };

    const expectedMimeType = validMimeTypes[fileExt];
    if (expectedMimeType && req.file.mimetype !== expectedMimeType) {
      console.warn(`MIME type mismatch: expected ${expectedMimeType}, got ${req.file.mimetype}`);
      // Don't fail validation for MIME type mismatch, just log it
    }

    // Add detected file info to request
    req.fileInfo = {
      detectedType: fileExt,
      detectedMime: req.file.mimetype,
      size: req.file.size,
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path
    };

    next();
  } catch (error) {
    // Clean up file if validation fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('File validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating file',
      error: error.message
    });
  }
};

// Cleanup function for old files
const cleanupOldFiles = () => {
  const tempDir = path.resolve(__dirname, config.fileUpload.tempDir);
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  try {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old file: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
};

// Schedule cleanup every hour
setInterval(cleanupOldFiles, 60 * 60 * 1000);

module.exports = {
  upload: upload.single('resume'),
  validateFile,
  cleanupOldFiles,
  ensureUploadDirs
};
