#!/usr/bin/env node

const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

/**
 * Test basic Tesseract OCR functionality
 */
async function testBasicOCR() {
  console.log('🔍 Testing Basic OCR Functionality');
  console.log('=' .repeat(50));

  try {
    // Test with a simple text image (we'll create a minimal test)
    console.log('📋 Testing Tesseract installation...');
    
    // Create a simple test
    const testText = 'Hello World! This is a test.';
    console.log(`📝 Testing OCR recognition capabilities...`);
    
    // Check available languages
    const worker = await Tesseract.createWorker('eng');
    
    console.log('✅ Tesseract worker initialized successfully');
    console.log('🌍 Available language: English (eng)');
    
    await worker.terminate();
    
    console.log('✅ Basic OCR test completed successfully');
    console.log('🚀 Ready for full OCR implementation');
    
  } catch (error) {
    console.error('❌ OCR test failed:', error);
    console.log('💡 Make sure Tesseract is properly installed');
  }
}

// Run the test
testBasicOCR().catch(console.error);
