#!/usr/bin/env node

const pdf2pic = require('pdf2pic');
const path = require('path');
const fs = require('fs');

async function testPdf2picConfig() {
  console.log('🔍 Testing pdf2pic configuration options');
  console.log('=' .repeat(50));

  try {
    // Test file path
    const testPdfPath = './uploads/Resumes/Resume 1.pdf';
    
    if (!fs.existsSync(testPdfPath)) {
      console.error('❌ Test PDF not found:', testPdfPath);
      return;
    }

    // Test different configurations
    const configs = [
      {
        name: 'Default (GraphicsMagick)',
        options: {
          density: 150,
          saveFilename: "test",
          savePath: "./uploads/temp",
          format: "png"
        }
      },
      {
        name: 'Force ImageMagick (convert)',
        options: {
          density: 150,
          saveFilename: "test",
          savePath: "./uploads/temp",
          format: "png",
          imageMagick: true
        }
      },
      {
        name: 'Force ImageMagick v7 (magick)',
        options: {
          density: 150,
          saveFilename: "test",
          savePath: "./uploads/temp",
          format: "png",
          imageMagick: '/opt/homebrew/bin/magick'
        }
      }
    ];

    // Create temp directory
    if (!fs.existsSync('./uploads/temp')) {
      fs.mkdirSync('./uploads/temp', { recursive: true });
    }

    for (const config of configs) {
      console.log(`\n📋 Testing: ${config.name}`);
      try {
        const convert = pdf2pic.fromPath(testPdfPath, config.options);
        console.log('✅ Convert object created successfully');
        
        // Try to convert just page 1
        const result = await convert(1);
        console.log(`✅ Conversion successful: ${result.path}`);
        
        // Clean up
        if (fs.existsSync(result.path)) {
          fs.unlinkSync(result.path);
        }
        
      } catch (error) {
        console.error(`❌ Error:`, error.message);
      }
    }

    // Clean up temp directory
    try {
      fs.rmdirSync('./uploads/temp');
    } catch (e) {
      // Ignore
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPdf2picConfig().catch(console.error);
