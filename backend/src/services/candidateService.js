const { PrismaClient } = require('../generated/prisma');
const llmService = require('./llmService');

class CandidateService {
  constructor() {
    this.prisma = new PrismaClient();
    this.llmService = llmService;
  }

  /**
   * Extract candidate data from resume text and create candidate record
   * @param {string} resumeId - Resume ID to link candidate to
   * @param {string} resumeText - The resume text to analyze
   * @returns {Promise<object>} - Created candidate with relations
   */
  async createCandidateFromResume(resumeId, resumeText) {
    try {
      console.log('Starting candidate extraction from resume...');

      // Extract structured data using LLM
      const extractionResult = await this.extractCandidateData(resumeText);
      
      if (!extractionResult.success) {
        throw new Error(`Failed to extract candidate data: ${extractionResult.error}`);
      }

      const extractedData = extractionResult.data;
      console.log('Extracted data summary:', {
        name: extractedData.personal_info?.name,
        email: extractedData.personal_info?.email,
        skillsCount: extractedData.skills?.length || 0,
        experienceCount: extractedData.experience?.length || 0,
        educationCount: extractedData.education?.length || 0
      });

      // Create candidate record with all related data in a transaction
      const candidate = await this.prisma.$transaction(async (tx) => {
        // 1. Create the main candidate record
        const candidateData = {
          resumeId: resumeId,
          fullName: extractedData.personal_info?.name || 'Unknown',
          email: extractedData.personal_info?.email,
          phone: extractedData.personal_info?.phone,
          location: extractedData.personal_info?.address,
          yearsExperience: this.calculateYearsOfExperience(extractedData.experience),
          summary: extractedData.summary,
          status: 'ACTIVE'
        };

        const newCandidate = await tx.candidate.create({
          data: candidateData
        });

        // 2. Create work experience records
        if (extractedData.experience && extractedData.experience.length > 0) {
          await this.createWorkExperience(tx, newCandidate.id, extractedData.experience);
        }

        // 3. Create education records
        if (extractedData.education && extractedData.education.length > 0) {
          await this.createEducation(tx, newCandidate.id, extractedData.education);
        }

        // 4. Create skills and candidate skills
        if (extractedData.skills && extractedData.skills.length > 0) {
          await this.createCandidateSkills(tx, newCandidate.id, extractedData.skills);
        }

        // 5. Create certifications if present
        if (extractedData.certifications && extractedData.certifications.length > 0) {
          await this.createCertifications(tx, newCandidate.id, extractedData.certifications);
        }

        return newCandidate;
      });

      // Fetch the complete candidate record with all relations
      const completeCandidate = await this.prisma.candidate.findUnique({
        where: { id: candidate.id },
        include: {
          resume: true,
          education: true,
          skills: {
            include: {
              skill: true
            }
          },
          workExperience: true,
          certifications: true
        }
      });

      console.log('Candidate created successfully:', {
        id: completeCandidate.id,
        name: completeCandidate.fullName,
        skillsCount: completeCandidate.skills.length,
        experienceCount: completeCandidate.workExperience.length,
        educationCount: completeCandidate.education.length
      });

      return {
        success: true,
        candidate: completeCandidate,
        extractedData: extractedData
      };

    } catch (error) {
      console.error('Failed to create candidate from resume:', error.message);
      return {
        success: false,
        error: error.message,
        candidate: null
      };
    }
  }

  /**
   * Extract candidate data using LLM with improved prompts for relational data
   * @param {string} resumeText - The resume text to analyze
   * @returns {Promise<object>} - Extracted structured data
   */
  async extractCandidateData(resumeText) {
    const prompt = this.createCandidateExtractionPrompt(resumeText);
    
    try {
      const result = await this.llmService.generateCompletion(prompt, {
        temperature: 0.1,
        max_tokens: 2000
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Parse the JSON response from the LLM
      const extractedData = this.parseExtractedData(result.response);
      
      return {
        success: true,
        data: extractedData,
        metadata: result.metadata
      };
    } catch (error) {
      console.error('Candidate data extraction failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        fallbackData: this.getFallbackCandidateData(resumeText)
      };
    }
  }

  /**
   * Create optimized prompt for candidate data extraction
   * @param {string} resumeText - The resume text
   * @returns {string} - Formatted prompt
   */
  createCandidateExtractionPrompt(resumeText) {
    return `Extract candidate information from this resume and return ONLY valid JSON. No additional text or explanations.

RESUME TEXT:
${resumeText}

Return JSON in exactly this format (use null for missing data, empty arrays for no items):

{
  "personal_info": {
    "name": "Full Name",
    "email": "email@domain.com",
    "phone": "+1-xxx-xxx-xxxx", 
    "address": "City, State/Country",
    "linkedin": "linkedin.com/in/username",
    "github": "github.com/username"
  },
  "summary": "Professional summary or objective",
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title", 
      "start_date": "2020-01-01",
      "end_date": "2023-12-31",
      "is_current": false,
      "description": "Key responsibilities"
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "start_year": 2016,
      "end_year": 2020,
      "gpa": 3.8
    }
  ],
  "skills": ["JavaScript", "Python", "React"],
  "certifications": [
    {
      "name": "AWS Certified Developer",
      "issuer": "Amazon Web Services",
      "issue_date": "2023-06-15",
      "expiry_date": "2026-06-15",
      "credential_id": "ABC123"
    }
  ]
}

JSON:`;
  }

  /**
   * Parse extracted data with enhanced error handling
   * @param {string} response - Raw LLM response
   * @returns {object} - Parsed structured data
   */
  parseExtractedData(response) {
    try {
      // Clean the response to extract JSON
      let cleanedResponse = response.trim();
      
      // Remove any markdown code blocks
      cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
      
      // Extract JSON content
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd);
      }

      // Parse and validate structure
      const parsed = JSON.parse(cleanedResponse);
      return this.normalizeExtractedData(parsed);
      
    } catch (error) {
      console.error('Failed to parse candidate data:', error.message);
      // Use the existing manual extraction from LLMService as fallback
      return this.llmService.extractDataManually(response);
    }
  }

  /**
   * Create work experience records
   * @param {object} tx - Prisma transaction
   * @param {string} candidateId - Candidate ID
   * @param {Array} experiences - Work experience data
   */
  async createWorkExperience(tx, candidateId, experiences) {
    for (const exp of experiences) {
      await tx.workExperience.create({
        data: {
          candidateId: candidateId,
          company: exp.company || 'Unknown Company',
          position: exp.position || 'Unknown Position',
          startDate: this.parseDate(exp.start_date),
          endDate: this.parseDate(exp.end_date),
          isCurrent: exp.is_current || false,
          description: exp.description
        }
      });
    }
  }

  /**
   * Create education records
   * @param {object} tx - Prisma transaction
   * @param {string} candidateId - Candidate ID
   * @param {Array} educations - Education data
   */
  async createEducation(tx, candidateId, educations) {
    for (const edu of educations) {
      await tx.education.create({
        data: {
          candidateId: candidateId,
          institution: edu.institution || 'Unknown Institution',
          degree: edu.degree || 'Unknown Degree',
          field: edu.field,
          startYear: edu.start_year,
          endYear: edu.end_year,
          gpa: edu.gpa
        }
      });
    }
  }

  /**
   * Create skills and candidate skills
   * @param {object} tx - Prisma transaction
   * @param {string} candidateId - Candidate ID
   * @param {Array} skills - Skills list
   */
  async createCandidateSkills(tx, candidateId, skills) {
    for (const skillName of skills) {
      if (!skillName || skillName.trim() === '') continue;

      // Find or create the skill
      const skill = await tx.skill.upsert({
        where: { name: skillName.trim() },
        update: {},
        create: {
          name: skillName.trim(),
          category: this.categorizeSkill(skillName)
        }
      });

      // Create candidate skill relationship
      await tx.candidateSkill.create({
        data: {
          candidateId: candidateId,
          skillId: skill.id,
          proficiency: 0.8, // Default proficiency score
          yearsExperience: null
        }
      });
    }
  }

  /**
   * Create certification records
   * @param {object} tx - Prisma transaction
   * @param {string} candidateId - Candidate ID
   * @param {Array} certifications - Certification data
   */
  async createCertifications(tx, candidateId, certifications) {
    for (const cert of certifications) {
      if (typeof cert === 'string') {
        // Simple string certification
        await tx.certification.create({
          data: {
            candidateId: candidateId,
            name: cert,
            issuer: 'Unknown',
            issueDate: null,
            expiryDate: null
          }
        });
      } else {
        // Detailed certification object
        await tx.certification.create({
          data: {
            candidateId: candidateId,
            name: cert.name || 'Unknown Certification',
            issuer: cert.issuer || 'Unknown Issuer',
            issueDate: this.parseDate(cert.issue_date),
            expiryDate: this.parseDate(cert.expiry_date),
            credentialId: cert.credential_id,
            credentialUrl: cert.credential_url
          }
        });
      }
    }
  }

  /**
   * Calculate years of experience from work history
   * @param {Array} experiences - Work experience array
   * @returns {number} - Total years of experience
   */
  calculateYearsOfExperience(experiences) {
    if (!experiences || experiences.length === 0) return 0;

    let totalMonths = 0;
    const currentDate = new Date();

    for (const exp of experiences) {
      const startDate = this.parseDate(exp.start_date) || new Date();
      const endDate = exp.is_current ? currentDate : (this.parseDate(exp.end_date) || currentDate);

      if (startDate && endDate && endDate >= startDate) {
        const diffTime = endDate - startDate;
        const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
        totalMonths += diffMonths;
      }
    }

    return Math.round(totalMonths / 12);
  }

  /**
   * Categorize a skill based on common patterns
   * @param {string} skillName - The skill name
   * @returns {string} - Skill category
   */
  categorizeSkill(skillName) {
    const skill = skillName.toLowerCase();
    
    const technicalKeywords = ['javascript', 'python', 'java', 'react', 'node', 'sql', 'html', 'css', 'api', 'git', 'docker', 'kubernetes', 'aws', 'azure', 'mongodb', 'postgresql'];
    const frameworkKeywords = ['react', 'angular', 'vue', 'express', 'django', 'spring', 'laravel'];
    const toolKeywords = ['git', 'docker', 'jira', 'slack', 'figma', 'photoshop'];
    const certificationKeywords = ['certified', 'certification', 'pmp', 'scrum', 'agile'];
    const languageKeywords = ['english', 'spanish', 'french', 'mandarin', 'hindi'];

    if (certificationKeywords.some(keyword => skill.includes(keyword))) return 'CERTIFICATION';
    if (languageKeywords.some(keyword => skill.includes(keyword))) return 'LANGUAGE';
    if (frameworkKeywords.some(keyword => skill.includes(keyword))) return 'FRAMEWORK';
    if (toolKeywords.some(keyword => skill.includes(keyword))) return 'TOOL';
    if (technicalKeywords.some(keyword => skill.includes(keyword))) return 'TECHNICAL';
    
    return 'SOFT_SKILL'; // Default category
  }

  /**
   * Parse date string to Date object
   * @param {string} dateStr - Date string in various formats
   * @returns {Date|null} - Parsed date or null
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      // Handle YYYY-MM-DD format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(dateStr);
      }
      
      // Handle other formats
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch (error) {
      return null;
    }
  }

  /**
   * Normalize extracted data structure
   * @param {object} data - Raw extracted data
   * @returns {object} - Normalized data
   */
  normalizeExtractedData(data) {
    return {
      personal_info: {
        name: data.personal_info?.name || null,
        email: data.personal_info?.email || null,
        phone: data.personal_info?.phone || null,
        address: data.personal_info?.address || null,
        linkedin: data.personal_info?.linkedin || null,
        github: data.personal_info?.github || null
      },
      summary: data.summary || null,
      skills: Array.isArray(data.skills) ? data.skills.filter(s => s && s.trim()) : [],
      experience: Array.isArray(data.experience) ? data.experience : [],
      education: Array.isArray(data.education) ? data.education : [],
      certifications: Array.isArray(data.certifications) ? data.certifications : []
    };
  }

  /**
   * Get fallback candidate data for failed extractions
   * @param {string} resumeText - Resume text for basic extraction
   * @returns {object} - Basic candidate data
   */
  getFallbackCandidateData(resumeText) {
    return {
      personal_info: {
        name: 'Unknown',
        email: null,
        phone: null,
        address: null,
        linkedin: null,
        github: null
      },
      summary: resumeText.substring(0, 200) + '...',
      skills: [],
      experience: [],
      education: [],
      certifications: []
    };
  }

  /**
   * Get candidate by ID with all relations
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<object>} - Complete candidate data
   */
  async getCandidateById(candidateId) {
    try {
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
          resume: true,
          education: true,
          skills: {
            include: {
              skill: true
            }
          },
          workExperience: true,
          certifications: true,
          shortlistEntries: {
            include: {
              shortlist: {
                include: {
                  job: true
                }
              }
            }
          }
        }
      });

      return {
        success: true,
        candidate: candidate
      };
    } catch (error) {
      console.error('Failed to get candidate:', error.message);
      return {
        success: false,
        error: error.message,
        candidate: null
      };
    }
  }

  /**
   * Search candidates by various criteria
   * @param {object} criteria - Search criteria
   * @returns {Promise<object>} - Search results
   */
  async searchCandidates(criteria = {}) {
    try {
      const where = {};
      
      if (criteria.name) {
        where.fullName = { contains: criteria.name, mode: 'insensitive' };
      }
      
      if (criteria.email) {
        where.email = { contains: criteria.email, mode: 'insensitive' };
      }
      
      if (criteria.skills && criteria.skills.length > 0) {
        where.skills = {
          some: {
            skill: {
              name: { in: criteria.skills }
            }
          }
        };
      }
      
      if (criteria.minExperience) {
        where.yearsExperience = { gte: criteria.minExperience };
      }

      const candidates = await this.prisma.candidate.findMany({
        where,
        include: {
          skills: {
            include: {
              skill: true
            }
          },
          workExperience: true,
          education: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return {
        success: true,
        candidates: candidates,
        count: candidates.length
      };
    } catch (error) {
      console.error('Failed to search candidates:', error.message);
      return {
        success: false,
        error: error.message,
        candidates: []
      };
    }
  }
}

module.exports = { CandidateService };
