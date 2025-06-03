const Groq = require('groq-sdk');
const { config } = require('../config/config');

class LLMService {
  constructor() {
    // Initialize Groq client
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    
    this.config = {
      model: 'llama3-70b-8192', // Fast and capable Llama3 70B model
      temperature: 0.1,
      max_tokens: 10000, // Increased to prevent truncation
      timeout: 15000 // 15 seconds - much faster than Ollama
    };
  }

  /**
   * Test connection to Groq
   * @returns {Promise<boolean>} - Connection status
   */
  async testConnection() {
    try {
      const response = await this.groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: "Hello, please respond with 'Connection successful'"
          }
        ],
        model: this.config.model,
        max_tokens: 10
      });

      console.log('Groq connection successful');
      return {
        success: true,
        model: this.config.model,
        message: 'Connected to Groq successfully',
        response: response.choices[0]?.message?.content || 'Connected'
      };
    } catch (error) {
      console.error('Groq connection failed:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to connect to Groq - check GROQ_API_KEY environment variable'
      };
    }
  }

  /**
   * Generate completion using Groq
   * @param {string} prompt - The prompt to send to the model
   * @param {object} options - Additional options for the request
   * @returns {Promise<object>} - Generated response
   */
  async generateCompletion(prompt, options = {}) {
    try {
      console.log(`Sending request to Groq model: ${options.model || this.config.model}`);
      
      const response = await this.groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: options.model || this.config.model,
        temperature: options.temperature || this.config.temperature,
        max_tokens: options.max_tokens || this.config.max_tokens
      });

      return {
        success: true,
        response: response.choices[0]?.message?.content || '',
        model: response.model,
        metadata: {
          usage: response.usage,
          created: response.created,
          id: response.id,
          system_fingerprint: response.system_fingerprint
        }
      };
    } catch (error) {
      console.error('Groq generation failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate Groq response'
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
    return `Extract key information from this resume and return ONLY valid JSON:

RESUME TEXT:
${resumeText}

Return JSON with this structure (use null for missing data):
{
  "personal_info": {
    "name": "Full Name",
    "email": "email@domain.com",
    "phone": "+1-xxx-xxx-xxxx",
    "address": "City, State",
    "linkedin": "linkedin.com/in/username"
  },
  "summary": "Brief professional summary",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "start_date": "Month Year",
      "end_date": "Month Year",
      "description": "Brief description"
    }
  ],
  "education": [
    {
      "institution": "University",
      "degree": "Degree",
      "field": "Field",
      "graduation_date": "Year"
    }
  ],
  "certifications": ["cert1", "cert2"]
}

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
      cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
      
      // Remove any text before the first { and after the last }
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd);
      }
      
      // Enhanced JSON cleaning for LLM responses
      cleanedResponse = cleanedResponse
        // Remove trailing commas before closing braces/brackets
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix incomplete trailing objects/arrays
        .replace(/,\s*$/, '')
        // Handle truncated responses - close incomplete arrays/objects
        .replace(/,\s*"[^"]*$/, '')  // Remove incomplete trailing properties
        .replace(/:\s*"[^"]*$/, ': null')  // Replace incomplete values with null
        .replace(/:\s*\[([^\]]*[^,\]])?\s*$/, ': []');  // Close incomplete arrays
      
      // Try to parse the cleaned JSON
      let parsed;
      try {
        parsed = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.log('Initial JSON parse failed, attempting to fix truncated response...');
        console.log('Parse error:', parseError.message);
        console.log('Cleaned response length:', cleanedResponse.length);
        
        // More aggressive approach: find the last complete structure
        let depth = 0;
        let lastValidIndex = -1;
        let inString = false;
        let escapeNext = false;
        
        for (let i = 0; i < cleanedResponse.length; i++) {
          const char = cleanedResponse[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{' || char === '[') {
              depth++;
            } else if (char === '}' || char === ']') {
              depth--;
              if (depth === 0) {
                lastValidIndex = i + 1;
              }
            }
          }
        }
        
        if (lastValidIndex > 0) {
          const truncatedJson = cleanedResponse.substring(0, lastValidIndex);
          console.log('Attempting to parse truncated JSON of length:', truncatedJson.length);
          parsed = JSON.parse(truncatedJson);
        } else {
          // Last resort: try to extract data manually using regex
          console.log('Attempting manual data extraction...');
          return this.extractDataManually(response);
        }
      }
      
      // Validate and normalize the structure
      return this.normalizeExtractedData(parsed);
      
    } catch (error) {
      console.error('Failed to parse LLM response as JSON:', error.message);
      console.log('Original response preview:', response.substring(0, 500) + '...');
      
      // Try manual extraction as final fallback
      return this.extractDataManually(response);
    }
  }

  /**
   * Manual data extraction using regex patterns as last resort
   * @param {string} response - Raw LLM response
   * @returns {object} - Extracted data
   */
  extractDataManually(response) {
    console.log('Using manual regex extraction...');
    
    try {
      const data = this.getEmptyDataStructure();
      
      // Extract personal info using regex
      const nameMatch = response.match(/"name":\s*"([^"]+)"/);
      const emailMatch = response.match(/"email":\s*"([^"]+)"/);
      const phoneMatch = response.match(/"phone":\s*"([^"]+)"/);
      const addressMatch = response.match(/"address":\s*"([^"]+)"/);
      const linkedinMatch = response.match(/"linkedin":\s*"([^"]+)"/);
      
      if (nameMatch) data.personal_info.name = nameMatch[1];
      if (emailMatch) data.personal_info.email = emailMatch[1];
      if (phoneMatch) data.personal_info.phone = phoneMatch[1];
      if (addressMatch) data.personal_info.address = addressMatch[1];
      if (linkedinMatch) data.personal_info.linkedin = linkedinMatch[1];
      
      // Extract summary
      const summaryMatch = response.match(/"summary":\s*"([^"]+)"/);
      if (summaryMatch) data.summary = summaryMatch[1];
      
      // Extract skills array
      const skillsMatch = response.match(/"skills":\s*\[(.*?)\]/s);
      if (skillsMatch) {
        const skillsStr = skillsMatch[1];
        const skills = skillsStr.match(/"([^"]+)"/g);
        if (skills) {
          data.skills = skills.map(skill => skill.replace(/"/g, ''));
        }
      }
      
      console.log('Manual extraction completed:', {
        name: data.personal_info.name,
        email: data.personal_info.email,
        phone: data.personal_info.phone,
        skillsCount: data.skills.length
      });
      
      return data;
      
    } catch (error) {
      console.error('Manual extraction failed:', error.message);
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
