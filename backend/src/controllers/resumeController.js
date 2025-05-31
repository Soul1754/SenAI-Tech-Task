const { prisma } = require('../config/config');

class ResumeController {
  // POST /api/resumes/upload
  static async uploadResume(req, res) {
    try {
      // TODO: Implement resume upload functionality
      res.status(201).json({
        success: true,
        message: 'Resume uploaded successfully',
        data: null
      });
    } catch (error) {
      console.error('Resume upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading resume',
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
}

module.exports = ResumeController;
