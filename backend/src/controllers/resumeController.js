const { prisma } = require('../config/config');
const FileProcessingService = require('../services/fileProcessingService');
const llmService = require('../services/llmService');

class ResumeController {
  // POST /api/resumes/upload
  static async uploadResume(req, res) {
    try {
      const userId = req.user.id;
      const fileInfo = req.fileInfo;

      if (!fileInfo) {
        return res.status(400).json({
          success: false,
          message: 'No valid file uploaded'
        });
      }

      console.log(`Processing resume upload for user ${userId}:`, {
        filename: fileInfo.originalName,
        type: fileInfo.detectedType,
        size: fileInfo.size
      });

      // Process the uploaded file
      const processingResult = await FileProcessingService.processResumeFile(fileInfo, userId);

      res.status(201).json({
        success: true,
        message: 'Resume uploaded and processed successfully',
        data: {
          resume: {
            id: processingResult.resume.id,
            filename: processingResult.resume.filename,
            fileType: processingResult.resume.fileType,
            status: processingResult.resume.status,
            processingStage: processingResult.resume.processingStage,
            processingId: processingResult.processingId,
            uploadedAt: processingResult.resume.createdAt
          },
          processing: {
            textExtracted: processingResult.textExtracted,
            qualityAssessment: processingResult.qualityAssessment
          }
        }
      });
    } catch (error) {
      console.error('Resume upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading and processing resume',
        error: error.message
      });
    }
  }

  // GET /api/resumes
  static async getAllResumes(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status,
        processingStage,
        candidateId,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build where clause
      const where = {};
      if (status) where.status = status.toUpperCase();
      if (processingStage) where.processingStage = processingStage.toUpperCase();
      if (candidateId) where.candidateId = candidateId;

      // Build order by clause
      const orderBy = {};
      orderBy[sortBy] = sortOrder.toLowerCase();

      const [resumes, total] = await Promise.all([
        prisma.resume.findMany({
          where,
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy,
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.resume.count({ where })
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        message: 'Resumes retrieved successfully',
        data: {
          resumes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages
          }
        }
      });
    } catch (error) {
      console.error('Get resumes error:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving resumes',
        error: error.message
      });
    }
  }

  // GET /api/resumes/:id
  static async getResumeById(req, res) {
    try {
      const { id } = req.params;

      const resume = await prisma.resume.findUnique({
        where: { id },
        include: {
          candidate: true,
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          extractedData: true,
          processingLogs: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!resume) {
        return res.status(404).json({
          success: false,
          message: 'Resume not found'
        });
      }

      res.json({
        success: true,
        message: 'Resume retrieved successfully',
        data: resume
      });
    } catch (error) {
      console.error('Get resume error:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving resume',
        error: error.message
      });
    }
  }

  // PUT /api/resumes/:id
  static async updateResume(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const resume = await prisma.resume.update({
        where: { id },
        data: updateData,
        include: {
          candidate: true,
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Resume updated successfully',
        data: resume
      });
    } catch (error) {
      console.error('Update resume error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating resume',
        error: error.message
      });
    }
  }

  // DELETE /api/resumes/:id
  static async deleteResume(req, res) {
    try {
      const { id } = req.params;

      await prisma.resume.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Resume deleted successfully'
      });
    } catch (error) {
      console.error('Delete resume error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting resume',
        error: error.message
      });
    }
  }

  // POST /api/resumes/:id/process
  static async processResume(req, res) {
    try {
      const { id } = req.params;

      // TODO: Implement resume processing logic
      res.json({
        success: true,
        message: 'Resume processing initiated',
        data: null
      });
    } catch (error) {
      console.error('Process resume error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing resume',
        error: error.message
      });
    }
  }

  // GET /api/resumes/:id/status
  static async getProcessingStatus(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Resume ID is required'
        });
      }

      const status = await FileProcessingService.getProcessingStatus(id);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting processing status:', error);
      
      if (error.message === 'Resume not found') {
        return res.status(404).json({
          success: false,
          message: 'Resume not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error getting processing status',
        error: error.message
      });
    }
  }

  // POST /api/resumes/test-llm-extraction
  static async testLLMExtraction(req, res) {
    try {
      const { resumeText } = req.body;

      if (!resumeText || typeof resumeText !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Resume text is required'
        });
      }

      console.log('Testing LLM extraction for provided text...');

      // Test LLM extraction
      const extractionResult = await llmService.extractResumeData(resumeText);
      
      let summaryResult = null;
      if (extractionResult.success) {
        summaryResult = await llmService.generateCandidateSummary(extractionResult.data);
      }

      res.json({
        success: true,
        message: 'LLM extraction test completed',
        data: {
          extraction: {
            success: extractionResult.success,
            data: extractionResult.data,
            error: extractionResult.error,
            metadata: extractionResult.metadata,
            usedFallback: extractionResult.usedFallback || false
          },
          summary: summaryResult ? {
            success: summaryResult.success,
            summary: summaryResult.summary,
            fallbackSummary: summaryResult.fallbackSummary,
            error: summaryResult.error
          } : null
        }
      });
    } catch (error) {
      console.error('LLM extraction test error:', error);
      res.status(500).json({
        success: false,
        message: 'Error testing LLM extraction',
        error: error.message
      });
    }
  }

  // GET /api/resumes/llm-status
  static async getLLMStatus(req, res) {
    try {
      const connectionTest = await llmService.testConnection();
      
      res.json({
        success: true,
        data: {
          ollama: {
            connected: connectionTest.success,
            error: connectionTest.error,
            models: connectionTest.models || [],
            baseUrl: llmService.config.baseUrl,
            currentModel: llmService.config.model
          },
          features: {
            structuredExtraction: true,
            summaryGeneration: true,
            fallbackSupport: true
          }
        }
      });
    } catch (error) {
      console.error('Error getting LLM status:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting LLM status',
        error: error.message
      });
    }
  }
}

module.exports = ResumeController;
