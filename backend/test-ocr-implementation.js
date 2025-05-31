#!/usr/bin/env node

const TextExtractor = require('./src/utils/textExtractor');
const path = require('path');
const fs = require('fs');

/**
 * Test the full OCR implementation
 */
async function testOCRImplementation() {
  console.log('🔍 Testing Step 5: Full OCR Implementation');
  console.log('=' .repeat(60));

  const resumesDir = './uploads/Resumes';
  
  if (!fs.existsSync(resumesDir)) {
    console.error('❌ Resumes directory not found:', resumesDir);
    return;
  }

  const files = fs.readdirSync(resumesDir);
  console.log(`📁 Found ${files.length} files in ${resumesDir}`);

  // Test different file types
  const testFiles = [
    { pattern: /\.pdf$/i, type: 'PDF', limit: 5 },
    { pattern: /\.docx$/i, type: 'DOCX', limit: 5 },
    { pattern: /\.txt$/i, type: 'TXT', limit: 1 }
  ];

  for (const { pattern, type, limit } of testFiles) {
    console.log(`\n📄 Testing ${type} files...`);
    console.log('-'.repeat(40));

    const matchingFiles = files.filter(file => pattern.test(file)).slice(0, limit);
    
    if (matchingFiles.length === 0) {
      console.log(`⚠️  No ${type} files found`);
      continue;
    }

    for (const file of matchingFiles) {
      const filePath = path.join(resumesDir, file);
      const ext = path.extname(file).toLowerCase().slice(1);
      
   
      
      try {
        const startTime = Date.now();
        const result = await TextExtractor.extractText(filePath, ext);
        const duration = Date.now() - startTime;
        
        console.log(`⏱️  Processing time: ${duration}ms`);
        console.log(`📝 Extracted text length: ${result.text.length} characters`);
        console.log(`🎯 Extraction method: ${result.metadata.extractionMethod || 'text'}`);
        
        if (result.metadata.ocrConfidence !== undefined) {
          console.log(`📈 OCR confidence: ${result.metadata.ocrConfidence}%`);
        }
        
        // Quality assessment
        const quality = TextExtractor.assessTextQuality(result.text);
        console.log(`✅ Quality: ${quality.quality} (${quality.confidence}% confidence)`);
        console.log(`📊 Word count: ${quality.wordCount}`);
        console.log(`🔑 Keywords found: ${quality.keywordsFound}`);
        
        if (quality.issues.length > 0) {
          console.log(`⚠️  Issues: ${quality.issues.join(', ')}`);
        }

        // Show first 200 characters of extracted text
        if (result.text.length > 0) {
          const preview = result.text.substring(0, 200).replace(/\n/g, ' ');
          console.log(`📖 Text preview: "${preview}${result.text.length > 200 ? '...' : ''}"`);
        }
        
        console.log('✅ SUCCESS');
        
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
      }
    }
  }

  console.log('\n🏁 OCR Implementation Test Complete');
  console.log('=' .repeat(60));
}

// Run the test
testOCRImplementation().catch(console.error);
