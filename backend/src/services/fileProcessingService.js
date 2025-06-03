const fs = require('fs');
const path = require('path');
const { prisma, config } = require('../config/config');
const TextExtractor = require('../utils/textExtractor');
const llmService = require('./llmService');
const { CandidateService } = require('./candidateService');

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
      
      // Step 5: Create candidate from resume using LLM
      const candidateResult = await this.createCandidateFromResume(extractionResult.text, resume.id);
      
      // Step 6: Update resume record with processing results
      const updatedResume = await this.updateResumeWithResults(
        resume.id,
        extractionResult,
        qualityAssessment,
        processedFilePath,
        candidateResult
      );
      
      // Step 7: Create processing log
      await this.createProcessingLog(
        resume.id, 
        'AI_ANALYSIS', 
        'COMPLETED', 
        `Processing completed for ${processingId}. Quality: ${qualityAssessment.quality}`,
        null
      );
      
      console.log(`File processing completed: ${processingId}`);
      
      return {
        success: true,
        resume: updatedResume,
        candidate: candidateResult.success ? candidateResult.candidate : null,
        processingId,
        textExtracted: extractionResult.text.length > 0,
        qualityAssessment,
        candidateCreated: candidateResult.success
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
   * Create candidate from resume using LLM service
   */
  static async createCandidateFromResume(extractedText, resumeId) {
    try {
      console.log(`Creating candidate for resume ${resumeId}`);
      
      // Create processing log for candidate creation
      await this.createProcessingLog(
        resumeId, 
        'CANDIDATE_CREATION', 
        'STARTED', 
        'Starting candidate creation from resume data',
        null
      );
      
      const candidateService = new CandidateService();
      const result = await candidateService.createCandidateFromResume(resumeId, extractedText);
      
      if (result.success) {
        await this.createProcessingLog(
          resumeId, 
          'CANDIDATE_CREATION', 
          'COMPLETED', 
          `Candidate created successfully: ${result.candidate.fullName}`,
          null
        );
        return result;
      } else {
        await this.createProcessingLog(
          resumeId, 
          'CANDIDATE_CREATION', 
          'FAILED', 
          'Candidate creation failed',
          result.error
        );
        return {
          success: false,
          candidate: null,
          error: result.error
        };
      }
    } catch (error) {
      console.error('Error creating candidate:', error);
      
      await this.createProcessingLog(
        resumeId, 
        'CANDIDATE_CREATION', 
        'FAILED', 
        'Candidate creation error',
        error.message
      );
      
      return {
        success: false,
        candidate: null,
        error: error.message
      };
    }
  }

  /**
   * Update resume record with processing results
   */
  static async updateResumeWithResults(resumeId, extractionResult, qualityAssessment, processedFilePath, candidateResult = null) {
    const updateData = {
      filePath: processedFilePath,
      extractedText: extractionResult.text,
      status: candidateResult?.success ? 'COMPLETED' : 'ANALYZED',
      processingStage: candidateResult?.success ? 'CANDIDATE_CREATED' : 'TEXT_EXTRACTED',
      processedAt: new Date(),
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

    // Add candidate creation metadata if available
    if (candidateResult) {
      updateData.metadata.candidateCreation = {
        createdAt: new Date().toISOString(),
        success: candidateResult.success,
        candidateId: candidateResult.success ? candidateResult.candidate.id : null,
        error: candidateResult.error || null
      };
    }

    return await prisma.resume.update({
      where: { id: resumeId },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        },
        candidate: candidateResult?.success ? {
          include: {
            skills: {
              include: {
                skill: true
              }
            },
            workExperience: true,
            education: true,
            certifications: true
          }
        } : false
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
