const express = require('express');
const router = express.Router();
const llmService = require('../services/llmService');

// @route   GET /api/llm/health
// @desc    Check LLM service health
// @access  Public
router.get('/health', async (req, res) => {
  try {
    const connectionTest = await llmService.testConnection();
    
    res.json({
      success: true,
      message: 'LLM service health check',
      data: {
        status: connectionTest.success ? 'healthy' : 'unhealthy',
        ollama: {
          connected: connectionTest.success,
          error: connectionTest.error,
          models: connectionTest.models || [],
          baseUrl: llmService.config.baseUrl,
          currentModel: llmService.config.model
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('LLM health check error:', error);
    res.status(503).json({
      success: false,
      message: 'LLM service health check failed',
      data: {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// @route   POST /api/llm/test
// @desc    Test LLM with simple prompt
// @access  Public (for development)
router.post('/test', async (req, res) => {
  try {
    const { prompt = 'What is 2+2? Answer with just the number.' } = req.body;
    
    const result = await llmService.generateCompletion(prompt, { max_tokens: 50 });
    
    res.json({
      success: true,
      message: 'LLM test completed',
      data: {
        prompt,
        response: result.response,
        success: result.success,
        model: result.model,
        metadata: result.metadata,
        error: result.error
      }
    });
  } catch (error) {
    console.error('LLM test error:', error);
    res.status(500).json({
      success: false,
      message: 'LLM test failed',
      error: error.message
    });
  }
});

module.exports = router;
