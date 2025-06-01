const fs = require('fs');
const path = require('path');
const { prisma, config } = require('../config/config');
const TextExtractor = require('../utils/textExtractor');
const llmService = require('./llmService');

class FileProcessingService {
  /**
   * Process uploaded resume file
   * @param {object} fileInfo - File information from multer
   * @param {string} userId - ID of user uploading the file
   * @returns {Promise<object>} - Processing results
   */
  static async processResumeFile(fileInfo, userId) {
    const processingId = this.generateProcessingId();
    
    try {
      console.log(`Starting file processing: ${processingId}`);
      
      // Step 1: Create resume record in database
      const resume = await this.createResumeRecord(fileInfo, userId, processingId);
      
      // Step 2: Extract text from file
      const extractionResult = await this.extractTextFromFile(fileInfo);
      
      // Step 3: Assess text quality
      const qualityAssessment = TextExtractor.assessTextQuality(extractionResult.text);
      
      // Step 4: Move file to processed directory
      const processedFilePath = await this.moveToProcessedDirectory(fileInfo, processingId);
      
      // Step 5: Extract structured data using LLM
      const structuredData = await this.extractStructuredData(extractionResult.text, resume.id);
      
      // Step 6: Update resume record with processing results
      const updatedResume = await this.updateResumeWithResults(
        resume.id,
        extractionResult,
        qualityAssessment,
        processedFilePath,
        structuredData
      );
      
      // Step 7: Create processing log
      await this.createProcessingLog(
        resume.id, 
        'COMPLETE_PROCESSING', 
        'COMPLETED', 
        `Complete processing finished for ${processingId}. Quality: ${qualityAssessment.quality}`,
        null
      );
      
      console.log(`File processing completed: ${processingId}`);
      
      return {
        success: true,
        resume: updatedResume,
        processingId,
        textExtracted: extractionResult.text.length > 0,
        qualityAssessment,
        structuredData: structuredData.success ? structuredData.data : null
      };
      
    } catch (error) {
      console.error(`File processing failed: ${processingId}`, error);
      
      // Log the error
      try {
        const resume = await prisma.resume.findFirst({
          where: { processingId }
        });
        
        if (resume) {
          await this.createProcessingLog(
            resume.id, 
            'TEXT_EXTRACTION', 
            'FAILED', 
            `Text extraction failed for ${processingId}`,
            error.message
          );
          
          // Update resume status to failed
          await prisma.resume.update({
            where: { id: resume.id },
            data: {
              status: 'FAILED',
              processingStage: 'TEXT_EXTRACTION_FAILED'
            }
          });
        }
      } catch (logError) {
        console.error('Error logging processing failure:', logError);
      }
      
      // Clean up temp file
      if (fileInfo.path && fs.existsSync(fileInfo.path)) {
        fs.unlinkSync(fileInfo.path);
      }
      
      throw error;
    }
  }

  /**
   * Create initial resume record in database
   */
  static async createResumeRecord(fileInfo, userId, processingId) {
    const fileMetadata = await TextExtractor.getFileMetadata(fileInfo.path);
    
    return await prisma.resume.create({
      data: {
        processingId,
        originalFileName: fileInfo.originalName,
        filePath: fileInfo.path,
        fileSize: fileInfo.size,
        fileType: fileInfo.detectedType.toUpperCase(),
        mimeType: fileInfo.detectedMime,
        uploadedBy: userId,
        status: 'PROCESSING',
        processingStage: 'TEXT_EXTRACTION',
        metadata: {
          originalFilename: fileInfo.originalName,
          detectedType: fileInfo.detectedType,
          uploadedAt: new Date().toISOString(),
          fileMetadata
        }
      }
    });
  }

  /**
   * Extract text from uploaded file
   */
  static async extractTextFromFile(fileInfo) {
    console.log(`Extracting text from ${fileInfo.detectedType} file: ${fileInfo.filename}`);
    
    const extractionResult = await TextExtractor.extractText(
      fileInfo.path,
      fileInfo.detectedType
    );
    
    // Clean the extracted text
    extractionResult.text = TextExtractor.cleanText(extractionResult.text);
    
    return extractionResult;
  }

  /**
   * Move file from temp to processed directory
   */
  static async moveToProcessedDirectory(fileInfo, processingId) {
    const processedDir = path.resolve(__dirname, config.fileUpload.processedDir);
    const fileExt = path.extname(fileInfo.filename);
    const newFileName = `${processingId}${fileExt}`;
    const newFilePath = path.join(processedDir, newFileName);
    
    // Ensure processed directory exists
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }
    
    // Move file
    fs.renameSync(fileInfo.path, newFilePath);
    
    return newFilePath;
  }

  /**
   * Extract structured data using LLM service
   */
  static async extractStructuredData(extractedText, resumeId) {
    try {
      console.log(`Extracting structured data for resume ${resumeId}`);
      
      // Create processing log for LLM extraction
      await this.createProcessingLog(
        resumeId, 
        'LLM_EXTRACTION', 
        'STARTED', 
        'Starting LLM-based structured data extraction',
        null
      );
      
      const result = await llmService.extractResumeData(extractedText);
      
      if (result.success) {
        await this.createProcessingLog(
          resumeId, 
          'LLM_EXTRACTION', 
          'COMPLETED', 
          'LLM extraction completed successfully',
          null
        );
        return result;
      } else {
        await this.createProcessingLog(
          resumeId, 
          'LLM_EXTRACTION', 
          'FAILED', 
          'LLM extraction failed, using fallback data',
          result.error
        );
        return {
          success: false,
          data: result.fallbackData || llmService.getEmptyDataStructure(),
          error: result.error,
          usedFallback: true
        };
      }
    } catch (error) {
      console.error('Error extracting structured data:', error);
      
      await this.createProcessingLog(
        resumeId, 
        'LLM_EXTRACTION', 
        'FAILED', 
        'LLM extraction error',
        error.message
      );
      
      // Return fallback data on error
      return {
        success: false,
        data: llmService.getEmptyDataStructure(),
        error: error.message,
        usedFallback: true
      };
    }
  }

  /**
   * Update resume record with processing results
   */
  static async updateResumeWithResults(resumeId, extractionResult, qualityAssessment, processedFilePath, structuredData = null) {
    const updateData = {
      filePath: processedFilePath,
      extractedText: extractionResult.text,
      status: 'PROCESSED',
      processingStage: 'COMPLETED',
      metadata: {
        ...await prisma.resume.findUnique({ where: { id: resumeId }, select: { metadata: true } }).then(r => r.metadata),
        textExtraction: {
          extractedAt: new Date().toISOString(),
          extractionMetadata: extractionResult.metadata,
          qualityAssessment,
          wordCount: extractionResult.text.split(/\s+/).length,
          characterCount: extractionResult.text.length
        }
      }
    };

    // Add structured data if available
    if (structuredData && structuredData.data) {
      updateData.metadata.llmExtraction = {
        extractedAt: new Date().toISOString(),
        success: structuredData.success,
        usedFallback: structuredData.usedFallback || false,
        error: structuredData.error || null
      };
      updateData.metadata.structuredData = structuredData.data;
    }

    return await prisma.resume.update({
      where: { id: resumeId },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    });
  }

  /**
   * Create processing log entry
   */
  static async createProcessingLog(resumeId, step, status, message = null, errorDetails = null) {
    return await prisma.processingLog.create({
      data: {
        resumeId,
        step,
        status,
        message,
        errorDetails,
        startedAt: new Date(),
        completedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : null
      }
    });
  }

  /**
   * Generate unique processing ID
   */
  static generateProcessingId() {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get processing status for a resume
   */
  static async getProcessingStatus(resumeId) {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        processingLogs: {
          orderBy: { startedAt: 'desc' },
          take: 10
        }
      }
    });

    if (!resume) {
      throw new Error('Resume not found');
    }

    return {
      resumeId: resume.id,
      status: resume.status,
      processingStage: resume.processingStage,
      processingId: resume.processingId,
      originalFileName: resume.originalFileName,
      uploadedAt: resume.uploadedAt,
      logs: resume.processingLogs
    };
  }

  /**
   * Clean up failed processing files
   */
  static async cleanupFailedProcessing(resumeId) {
    try {
      const resume = await prisma.resume.findUnique({
        where: { id: resumeId }
      });

      if (resume && resume.filePath && fs.existsSync(resume.filePath)) {
        fs.unlinkSync(resume.filePath);
      }

      // Delete from database
      await prisma.processingLog.deleteMany({
        where: { resumeId }
      });

      await prisma.resume.delete({
        where: { id: resumeId }
      });

      return { success: true, message: 'Failed processing cleaned up' };
    } catch (error) {
      console.error('Error cleaning up failed processing:', error);
      throw error;
    }
  }
}

module.exports = FileProcessingService;
