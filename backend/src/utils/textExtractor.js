const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');

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
        const ocrResult = await this.extractWithOCR(filePath);
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
        const ocrResult = await this.extractWithOCR(filePath);
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
   * Clean and normalize extracted text
   * @param {string} text - Raw extracted text
   * @returns {string} - Cleaned text
   */
  static cleanText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove leading/trailing whitespace
      .trim()
      // Remove null characters
      .replace(/\0/g, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive line breaks
      .replace(/\n{3,}/g, '\n\n');
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
      
      // For now, we'll implement a basic OCR that works with image files
      // PDF OCR will require additional PDF-to-image conversion
      const ext = path.extname(filePath).toLowerCase();
      
      if (ext === '.pdf') {
        console.log('PDF OCR requires additional setup - returning placeholder text');
        return {
          text: 'PDF OCR extraction requires additional configuration. This is an image-based PDF that needs OCR processing.',
          confidence: 0
        };
      }
      
      if (ext === '.docx') {
        console.log('DOCX OCR requires image extraction - returning placeholder text');
        return {
          text: 'DOCX OCR extraction requires image extraction from the document. This appears to be an image-based DOCX file.',
          confidence: 0
        };
      }

      // For actual image files, use Tesseract
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
}

module.exports = TextExtractor;
