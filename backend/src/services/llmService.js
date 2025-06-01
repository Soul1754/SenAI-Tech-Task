const axios = require('axios');
const { config } = require('../config/config');

class LLMService {
  constructor() {
    this.config = {
      baseUrl: config.ollama.baseUrl,
      model: config.ollama.model,
      timeout: config.ollama.timeout
    };
    
    // Create axios instance with timeout
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Test connection to Ollama
   * @returns {Promise<boolean>} - Connection status
   */
  async testConnection() {
    try {
      const response = await this.client.get('/api/tags');
      console.log('Ollama connection successful');
      return {
        success: true,
        models: response.data.models || [],
        message: 'Connected to Ollama successfully'
      };
    } catch (error) {
      console.error('Ollama connection failed:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to connect to Ollama'
      };
    }
  }

  /**
   * Generate completion using Ollama
   * @param {string} prompt - The prompt to send to the model
   * @param {object} options - Additional options for the request
   * @returns {Promise<object>} - Generated response
   */
  async generateCompletion(prompt, options = {}) {
    try {
      const requestData = {
        model: options.model || this.config.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.1,
          top_p: options.top_p || 0.9,
          max_tokens: options.max_tokens || 2000,
          ...options.modelOptions
        }
      };

      console.log(`Sending request to Ollama model: ${requestData.model}`);
      
      const response = await this.client.post('/api/generate', requestData);
      
      return {
        success: true,
        response: response.data.response,
        model: response.data.model,
        metadata: {
          eval_count: response.data.eval_count,
          eval_duration: response.data.eval_duration,
          load_duration: response.data.load_duration,
          prompt_eval_count: response.data.prompt_eval_count,
          prompt_eval_duration: response.data.prompt_eval_duration,
          total_duration: response.data.total_duration
        }
      };
    } catch (error) {
      console.error('LLM generation failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate LLM response'
      };
    }
  }

  /**
   * Extract structured data from resume text using LLM
   * @param {string} resumeText - The resume text to analyze
   * @returns {Promise<object>} - Extracted structured data
   */
  async extractResumeData(resumeText) {
    const prompt = this.createResumeExtractionPrompt(resumeText);
    
    try {
      const result = await this.generateCompletion(prompt, {
        temperature: 0.1,
        max_tokens: 1500
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
      console.error('Resume data extraction failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        fallbackData: this.getFallbackExtractionData(resumeText)
      };
    }
  }

  /**
   * Create a detailed prompt for resume data extraction
   * @param {string} resumeText - The resume text
   * @returns {string} - Formatted prompt
   */
  createResumeExtractionPrompt(resumeText) {
    return `You are an expert resume parser. Extract structured information from the resume text below and respond with ONLY valid JSON. Do not include any markdown, explanations, or additional text.

Required JSON structure:
{
  "personal_info": {
    "name": "string or null",
    "email": "string or null", 
    "phone": "string or null",
    "address": "string or null",
    "linkedin": "string or null",
    "github": "string or null"
  },
  "summary": "string or null",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "company": "string",
      "position": "string", 
      "start_date": "string",
      "end_date": "string",
      "description": "string",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string", 
      "graduation_date": "string",
      "gpa": "string or null"
    }
  ],
  "certifications": ["cert1", "cert2"],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["tech1", "tech2"],
      "url": "string or null"
    }
  ],
  "languages": [
    {
      "language": "string",
      "proficiency": "string"
    }
  ]
}

Resume Text:
${resumeText}

JSON:`;
  }

  /**
   * Parse the extracted data from LLM response
   * @param {string} response - Raw LLM response
   * @returns {object} - Parsed structured data
   */
  parseExtractedData(response) {
    try {
      // Clean the response to extract JSON
      let cleanedResponse = response.trim();
      
      // Remove any markdown code blocks if present
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Remove any text before the first { and after the last }
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd);
      }
      
      // Remove any invalid characters or malformed sections
      // Try to find the largest valid JSON object
      let parsed = null;
      let bestJSON = '';
      
      // Try parsing progressively smaller portions if needed
      for (let endIdx = cleanedResponse.length; endIdx > 0; endIdx -= 10) {
        try {
          const testJSON = cleanedResponse.substring(0, endIdx);
          if (testJSON.endsWith('}')) {
            parsed = JSON.parse(testJSON);
            bestJSON = testJSON;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!parsed) {
        // Fallback: try to fix common JSON issues
        cleanedResponse = cleanedResponse
          .replace(/,\s*}/g, '}')  // Remove trailing commas
          .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
          .replace(/([^"]),\s*([^"])/g, '$1,$2'); // Fix spacing
        
        parsed = JSON.parse(cleanedResponse);
      }
      
      // Validate and normalize the structure
      return this.normalizeExtractedData(parsed);
    } catch (error) {
      console.error('Failed to parse LLM response as JSON:', error.message);
      console.log('Cleaned response:', cleanedResponse?.substring(0, 500) + '...');
      
      // Return basic structure if parsing fails
      return this.getEmptyDataStructure();
    }
  }

  /**
   * Normalize extracted data to ensure consistent structure
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
      skills: Array.isArray(data.skills) ? data.skills : [],
      experience: Array.isArray(data.experience) ? data.experience.map(exp => ({
        company: exp.company || null,
        position: exp.position || null,
        start_date: exp.start_date || null,
        end_date: exp.end_date || null,
        description: exp.description || null,
        technologies: Array.isArray(exp.technologies) ? exp.technologies : []
      })) : [],
      education: Array.isArray(data.education) ? data.education.map(edu => ({
        institution: edu.institution || null,
        degree: edu.degree || null,
        field: edu.field || null,
        graduation_date: edu.graduation_date || null,
        gpa: edu.gpa || null
      })) : [],
      certifications: Array.isArray(data.certifications) ? data.certifications : [],
      projects: Array.isArray(data.projects) ? data.projects.map(proj => ({
        name: proj.name || null,
        description: proj.description || null,
        technologies: Array.isArray(proj.technologies) ? proj.technologies : [],
        url: proj.url || null
      })) : [],
      languages: Array.isArray(data.languages) ? data.languages.map(lang => ({
        language: lang.language || null,
        proficiency: lang.proficiency || null
      })) : []
    };
  }

  /**
   * Get fallback extraction data using basic regex/NLP
   * @param {string} resumeText - Resume text
   * @returns {object} - Basic extracted data
   */
  getFallbackExtractionData(resumeText) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
    
    const email = resumeText.match(emailRegex)?.[0] || null;
    const phone = resumeText.match(phoneRegex)?.[0] || null;
    
    // Extract basic skills using common technical keywords
    const skillKeywords = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'HTML', 'CSS',
      'Git', 'Docker', 'AWS', 'MongoDB', 'PostgreSQL', 'TypeScript', 'Vue.js',
      'Angular', 'Express', 'Django', 'Flask', 'Spring', 'Laravel', 'PHP'
    ];
    
    const foundSkills = skillKeywords.filter(skill => 
      resumeText.toLowerCase().includes(skill.toLowerCase())
    );

    return this.getEmptyDataStructure({
      personal_info: { email, phone },
      skills: foundSkills
    });
  }

  /**
   * Get empty data structure with optional defaults
   * @param {object} defaults - Default values to merge
   * @returns {object} - Empty structure
   */
  getEmptyDataStructure(defaults = {}) {
    const empty = {
      personal_info: {
        name: null,
        email: null,
        phone: null,
        address: null,
        linkedin: null,
        github: null
      },
      summary: null,
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      projects: [],
      languages: []
    };

    // Merge defaults if provided
    if (defaults.personal_info) {
      empty.personal_info = { ...empty.personal_info, ...defaults.personal_info };
    }
    if (defaults.skills) {
      empty.skills = defaults.skills;
    }

    return empty;
  }

  /**
   * Generate a summary for a candidate based on extracted data
   * @param {object} extractedData - Structured resume data
   * @returns {Promise<object>} - Generated summary
   */
  async generateCandidateSummary(extractedData) {
    const prompt = `Based on the following structured resume data, generate a concise 2-3 sentence professional summary highlighting the candidate's key strengths, experience level, and main technical skills.

Resume Data:
${JSON.stringify(extractedData, null, 2)}

Professional Summary:`;

    try {
      const result = await this.generateCompletion(prompt, {
        temperature: 0.3,
        max_tokens: 200
      });

      if (result.success) {
        return {
          success: true,
          summary: result.response.trim(),
          metadata: result.metadata
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Summary generation failed:', error.message);
      return {
        success: false,
        error: error.message,
        fallbackSummary: this.generateFallbackSummary(extractedData)
      };
    }
  }

  /**
   * Generate fallback summary without LLM
   * @param {object} extractedData - Structured resume data
   * @returns {string} - Basic summary
   */
  generateFallbackSummary(extractedData) {
    const skills = extractedData.skills?.slice(0, 5).join(', ') || 'various technologies';
    const yearsOfExp = extractedData.experience?.length || 0;
    const name = extractedData.personal_info?.name || 'Candidate';
    
    return `${name} is a professional with ${yearsOfExp} work experience${yearsOfExp > 0 ? 's' : ''} and expertise in ${skills}.`;
  }
}

module.exports = new LLMService();
