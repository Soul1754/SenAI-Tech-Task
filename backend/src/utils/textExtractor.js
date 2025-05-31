const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const pdf2pic = require('pdf2pic');
const yauzl = require('yauzl');

class TextExtractor {
  /**
   * Extract text from various file formats
   * @param {string} filePath - Path to the file
   * @param {string} fileType - File extension (pdf, doc, docx, etc.)
   * @returns {Promise<{text: string, metadata: object}>}
   */
  static async extractText(filePath, fileType) {
    try {
      switch (fileType.toLowerCase()) {
        case 'pdf':
          return await this.extractFromPDF(filePath);
        case 'docx':
          return await this.extractFromDOCX(filePath);
        case 'doc':
          return await this.extractFromDOC(filePath);
        case 'txt':
          return await this.extractFromTXT(filePath);
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error(`Error extracting text from ${fileType} file:`, error);
      throw error;
    }
  }

  /**
   * Extract text from PDF file
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<{text: string, metadata: object}>}
   */
  static async extractFromPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      // Check if extracted text is meaningful (more than just whitespace)
      const extractedText = data.text ? data.text.trim() : '';
      
      if (extractedText.length > 10) {
        // Good text extraction, return it
        return {
          text: data.text,
          metadata: {
            pages: data.numpages,
            info: data.info,
            version: data.version,
            extractedAt: new Date().toISOString(),
            extractionMethod: 'text'
          }
        };
      } else {
        // Poor text extraction, try OCR
        console.log('PDF appears to be image-based, falling back to OCR...');
        const ocrResult = await this.extractPDFWithOCR(filePath);
        return {
          text: ocrResult.text,
          metadata: {
            pages: data.numpages,
            info: data.info,
            version: data.version,
            extractedAt: new Date().toISOString(),
            extractionMethod: 'ocr',
            ocrConfidence: ocrResult.confidence
          }
        };
      }
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX file
   * @param {string} filePath - Path to DOCX file
   * @returns {Promise<{text: string, metadata: object}>}
   */
  static async extractFromDOCX(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      
      // Check if extracted text is meaningful (more than just whitespace)
      const extractedText = result.value ? result.value.trim() : '';
      
      if (extractedText.length > 10) {
        // Good text extraction, return it
        return {
          text: result.value,
          metadata: {
            messages: result.messages,
            extractedAt: new Date().toISOString(),
            extractionMethod: 'text'
          }
        };
      } else {
        // Poor text extraction, try OCR
        console.log('DOCX appears to be image-based, falling back to OCR...');
        const ocrResult = await this.extractDOCXWithOCR(filePath);
        return {
          text: ocrResult.text,
          metadata: {
            messages: result.messages,
            extractedAt: new Date().toISOString(),
            extractionMethod: 'ocr',
            ocrConfidence: ocrResult.confidence
          }
        };
      }
    } catch (error) {
      console.error('DOCX extraction error:', error);
      throw new Error(`Failed to extract text from DOCX: ${error.message}`);
    }
  }

  /**
   * Extract text from DOC file (legacy format)
   * @param {string} filePath - Path to DOC file
   * @returns {Promise<{text: string, metadata: object}>}
   */
  static async extractFromDOC(filePath) {
    try {
      // For DOC files, we'll try mammoth first
      // Note: mammoth primarily supports DOCX, but sometimes works with DOC
      const result = await mammoth.extractRawText({ path: filePath });
      
      return {
        text: result.value,
        metadata: {
          messages: result.messages,
          extractedAt: new Date().toISOString(),
          note: 'DOC file processed - quality may vary'
        }
      };
    } catch (error) {
      console.error('DOC extraction error:', error);
      throw new Error(`Failed to extract text from DOC: ${error.message}`);
    }
  }

  /**
   * Extract text from TXT file
   * @param {string} filePath - Path to TXT file
   * @returns {Promise<{text: string, metadata: object}>}
   */
  static async extractFromTXT(filePath) {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      
      return {
        text: text,
        metadata: {
          encoding: 'utf8',
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('TXT extraction error:', error);
      throw new Error(`Failed to extract text from TXT: ${error.message}`);
    }
  }

  /**
   * Clean and normalize extracted text for LLM processing
   * @param {string} text - Raw extracted text
   * @returns {string} - Cleaned text
   */
  static cleanText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      // Remove null characters and special control characters
      .replace(/\0/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      
      // Remove excessive whitespace but preserve paragraph structure
      .replace(/[ \t]+/g, ' ')  // Replace multiple spaces/tabs with single space
      .replace(/\n{3,}/g, '\n\n')  // Limit to max 2 consecutive line breaks
      
      // Remove leading/trailing whitespace from each line
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      
      // Final trim
      .trim();
  }

  /**
   * Extract metadata from file
   * @param {string} filePath - Path to file
   * @returns {Promise<object>} - File metadata
   */
  static async getFileMetadata(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase().slice(1);
      
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: ext,
        filename: path.basename(filePath)
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return {};
    }
  }

  /**
   * Validate extracted text quality
   * @param {string} text - Extracted text
   * @returns {object} - Quality assessment
   */
  static assessTextQuality(text) {
    if (!text || typeof text !== 'string') {
      return {
        quality: 'poor',
        confidence: 0,
        issues: ['No text extracted']
      };
    }

    const issues = [];
    let confidence = 100;

    // Check text length
    if (text.length < 50) {
      issues.push('Very short text extracted');
      confidence -= 30;
    }

    // Check for excessive special characters (might indicate OCR issues)
    const specialCharRatio = (text.match(/[^\w\s]/g) || []).length / text.length;
    if (specialCharRatio > 0.3) {
      issues.push('High ratio of special characters');
      confidence -= 20;
    }

    // Check for common resume keywords
    const resumeKeywords = [
      'experience', 'education', 'skills', 'work', 'employment',
      'university', 'college', 'degree', 'bachelor', 'master',
      'phone', 'email', 'address', 'linkedin'
    ];
    
    const foundKeywords = resumeKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    ).length;

    if (foundKeywords < 2) {
      issues.push('Few resume-related keywords found');
      confidence -= 25;
    }

    // Determine quality level
    let quality = 'excellent';
    if (confidence < 90) quality = 'good';
    if (confidence < 70) quality = 'fair';
    if (confidence < 50) quality = 'poor';

    return {
      quality,
      confidence: Math.max(0, confidence),
      issues,
      wordCount: text.split(/\s+/).length,
      characterCount: text.length,
      keywordsFound: foundKeywords
    };
  }

  /**
   * Extract text using OCR for image-based documents
   * @param {string} filePath - Path to the file
   * @returns {Promise<{text: string, confidence: number}>}
   */
  static async extractWithOCR(filePath) {
    try {
      console.log(`Starting OCR extraction for: ${filePath}`);
      
      const ext = path.extname(filePath).toLowerCase();
      
      if (ext === '.pdf') {
        return await this.extractPDFWithOCR(filePath);
      }
      
      if (ext === '.docx') {
        return await this.extractDOCXWithOCR(filePath);
      }

      // For actual image files, use Tesseract directly
      const { data: { text, confidence } } = await Tesseract.recognize(
        filePath,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      console.log(`OCR completed with confidence: ${confidence}%`);
      return {
        text: this.cleanText(text),
        confidence: confidence
      };
    } catch (error) {
      console.error('OCR extraction error:', error);
      // Return a fallback result instead of throwing
      return {
        text: 'OCR extraction failed. This file may require manual processing or additional OCR setup.',
        confidence: 0
      };
    }
  }

  /**
   * Extract text from PDF using OCR by converting to images
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<{text: string, confidence: number}>}
   */
  static async extractPDFWithOCR(filePath) {
    try {
      console.log(`Starting OCR extraction for: ${filePath}`);
      
      // Create temporary directory for images
      const tempDir = path.join(path.dirname(filePath), 'temp_ocr_images');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Convert PDF to images using pdf2pic (now working with GraphicsMagick)
      const options = {
        density: 300,           // DPI
        saveFilename: "page",
        savePath: tempDir,
        format: "png",
        width: 2480,           // A4 width at 300 DPI
        height: 3508           // A4 height at 300 DPI
      };

      const convert = pdf2pic.fromPath(filePath, options);
      console.log('Converting PDF pages to images...');
      
      // Get number of pages
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const numPages = pdfData.numpages;
      
      let allText = '';
      let totalConfidence = 0;
      let processedPages = 0;
      const maxPages = Math.min(numPages, 2); // Limit to 2 pages for testing

      // Process each page
      for (let pageIndex = 1; pageIndex <= maxPages; pageIndex++) {
        try {
          console.log(`Processing page ${pageIndex}/${maxPages}...`);
          
          const result = await convert(pageIndex);
          const imagePath = result.path;
          
          // Preprocess image for better OCR
          const processedImagePath = await this.preprocessImageForOCR(imagePath);
          
          // Run OCR on the page
          const worker = await Tesseract.createWorker('eng');
          const { data: { text, confidence } } = await worker.recognize(processedImagePath);
          await worker.terminate();

          if (text && text.trim().length > 0) {
            // Add clean text without page separators
            if (allText.length > 0) {
              allText += '\n\n'; // Just a clean paragraph break
            }
            allText += text.trim();
            totalConfidence += confidence;
            processedPages++;
            console.log(`Page ${pageIndex} OCR completed with ${confidence.toFixed(1)}% confidence`);
          }

          // Clean up processed image
          if (fs.existsSync(processedImagePath) && processedImagePath !== imagePath) {
            fs.unlinkSync(processedImagePath);
          }
          
          // Clean up original image
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }

        } catch (pageError) {
          console.error(`Error processing page ${pageIndex}:`, pageError.message);
        }
      }

      // Clean up temp directory
      try {
        if (fs.existsSync(tempDir)) {
          const files = fs.readdirSync(tempDir);
          files.forEach(file => {
            fs.unlinkSync(path.join(tempDir, file));
          });
          fs.rmdirSync(tempDir);
        }
      } catch (cleanupError) {
        console.warn('Cleanup warning:', cleanupError.message);
      }

      const averageConfidence = processedPages > 0 ? totalConfidence / processedPages : 0;
      console.log(`PDF OCR completed. Processed ${processedPages} pages with average confidence: ${averageConfidence.toFixed(1)}%`);

      if (allText.trim().length === 0) {
        return {
          text: "No text could be extracted from PDF pages",
          confidence: 0
        };
      }

      return {
        text: this.cleanText(allText),
        confidence: averageConfidence
      };
      
    } catch (error) {
      console.error('PDF OCR error:', error);
      return {
        text: `OCR extraction failed: ${error.message}`,
        confidence: 0
      };
    }
  }

  /**
   * Extract text from DOCX using OCR (placeholder for now)
   * @param {string} filePath - Path to DOCX file
   * @returns {Promise<{text: string, confidence: number}>}
   */
  static async extractDOCXWithOCR(filePath) {
    try {
      console.log(`Starting DOCX OCR extraction for: ${filePath}`);
      
      // Create temporary directory for extracted images
      const tempDir = path.join(path.dirname(filePath), 'temp_docx_images');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Extract images from DOCX file (DOCX is a ZIP file)
      const extractedImages = await this.extractImagesFromDOCX(filePath, tempDir);
      
      if (extractedImages.length === 0) {
        console.log('No images found in DOCX file');
        return {
          text: "No images found in DOCX file for OCR processing",
          confidence: 0
        };
      }

      console.log(`Found ${extractedImages.length} images in DOCX, processing with OCR...`);
      
      let allText = '';
      let totalConfidence = 0;
      let processedImages = 0;

      // Process each extracted image with OCR
      for (let i = 0; i < extractedImages.length; i++) {
        try {
          const imagePath = extractedImages[i];
          console.log(`Processing image ${i + 1}/${extractedImages.length}: ${path.basename(imagePath)}`);
          
          // Preprocess image for better OCR
          const processedImagePath = await this.preprocessImageForOCR(imagePath);
          
          // Run OCR on the image
          const worker = await Tesseract.createWorker('eng');
          const { data: { text, confidence } } = await worker.recognize(processedImagePath);
          await worker.terminate();

          if (text && text.trim().length > 0) {
            // Add clean text without image separators
            if (allText.length > 0) {
              allText += '\n\n'; // Just a clean paragraph break
            }
            allText += text.trim();
            totalConfidence += confidence;
            processedImages++;
            console.log(`Image ${i + 1} OCR completed with ${confidence.toFixed(1)}% confidence`);
          }

          // Clean up processed image
          if (fs.existsSync(processedImagePath) && processedImagePath !== imagePath) {
            fs.unlinkSync(processedImagePath);
          }

        } catch (imageError) {
          console.error(`Error processing image ${i + 1}:`, imageError.message);
        }
      }

      // Clean up extracted images and temp directory
      try {
        extractedImages.forEach(imagePath => {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
        
        if (fs.existsSync(tempDir)) {
          const files = fs.readdirSync(tempDir);
          files.forEach(file => {
            fs.unlinkSync(path.join(tempDir, file));
          });
          fs.rmdirSync(tempDir);
        }
      } catch (cleanupError) {
        console.warn('Cleanup warning:', cleanupError.message);
      }

      const averageConfidence = processedImages > 0 ? totalConfidence / processedImages : 0;
      console.log(`DOCX OCR completed. Processed ${processedImages} images with average confidence: ${averageConfidence.toFixed(1)}%`);

      if (allText.trim().length === 0) {
        return {
          text: "No text could be extracted from DOCX images",
          confidence: 0
        };
      }

      return {
        text: this.cleanText(allText),
        confidence: averageConfidence
      };
      
    } catch (error) {
      console.error('DOCX OCR extraction error:', error);
      return {
        text: `DOCX OCR extraction failed: ${error.message}`,
        confidence: 0
      };
    }
  }

  /**
   * Preprocess image for better OCR results
   * @param {string} imagePath - Path to the image
   * @returns {Promise<string>} - Path to processed image
   */
  static async preprocessImageForOCR(imagePath) {
    try {
      const processedPath = imagePath.replace(/\.png$/, '_processed.png');
      
      await sharp(imagePath)
        .resize({ width: 2480, height: 3508, fit: 'inside' }) // A4 at 300 DPI
        .greyscale() // Convert to grayscale
        .normalize() // Normalize contrast
        .sharpen() // Sharpen for better text recognition
        .png({ quality: 100 })
        .toFile(processedPath);
      
      return processedPath;
    } catch (error) {
      console.warn('Image preprocessing failed, using original:', error);
      return imagePath;
    }
  }

  /**
   * Extract images from DOCX file (DOCX is a ZIP archive)
   * @param {string} docxPath - Path to DOCX file
   * @param {string} outputDir - Directory to extract images to
   * @returns {Promise<string[]>} - Array of extracted image paths
   */
  static async extractImagesFromDOCX(docxPath, outputDir) {
    return new Promise((resolve, reject) => {
      const extractedImages = [];
      
      yauzl.open(docxPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        zipfile.readEntry();
        
        zipfile.on("entry", (entry) => {
          // Look for images in word/media/ folder
          if (entry.fileName.startsWith('word/media/') && 
              /\.(png|jpg|jpeg|gif|bmp)$/i.test(entry.fileName)) {
            
            console.log(`Found image: ${entry.fileName}`);
            
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                console.error(`Error opening ${entry.fileName}:`, err);
                zipfile.readEntry();
                return;
              }

              const imageName = path.basename(entry.fileName);
              const outputPath = path.join(outputDir, imageName);
              const writeStream = fs.createWriteStream(outputPath);
              
              readStream.pipe(writeStream);
              
              writeStream.on('close', () => {
                extractedImages.push(outputPath);
                zipfile.readEntry();
              });
              
              writeStream.on('error', (writeErr) => {
                console.error(`Error writing ${outputPath}:`, writeErr);
                zipfile.readEntry();
              });
            });
          } else {
            zipfile.readEntry();
          }
        });

        zipfile.on("end", () => {
          console.log(`Extracted ${extractedImages.length} images from DOCX`);
          resolve(extractedImages);
        });

        zipfile.on("error", (zipErr) => {
          reject(zipErr);
        });
      });
    });
  }
}

module.exports = TextExtractor;
