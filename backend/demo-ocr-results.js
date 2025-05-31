#!/usr/bin/env node

const TextExtractor = require('./src/utils/textExtractor');

async function demonstrateOCR() {
  console.log('🎯 OCR Demonstration - Extracting Real Resume Text');
  console.log('=' .repeat(60));

  try {
    const testFile = './uploads/Resumes/Resume 1.pdf';
    console.log(`📄 Processing: ${testFile}`);
    
    const startTime = Date.now();
    const result = await TextExtractor.extractFromPDF(testFile);
    const endTime = Date.now();
    
    console.log('\n📊 EXTRACTION RESULTS:');
    console.log('=' .repeat(40));
    console.log(`⏱️  Time: ${endTime - startTime}ms`);
    console.log(`📝 Text Length: ${result.text.length} characters`);
    console.log(`📄 Pages: ${result.metadata.pages}`);
    console.log(`🎯 Method: ${result.metadata.extractionMethod}`);
    console.log(`📈 OCR Confidence: ${result.metadata.ocrConfidence}%`);
    
    console.log('\n📖 EXTRACTED TEXT PREVIEW:');
    console.log('=' .repeat(40));
    console.log(result.text.substring(0, 500) + '...');
    
    // Quality assessment
    const quality = TextExtractor.assessTextQuality(result.text);
    console.log('\n🔍 QUALITY ASSESSMENT:');
    console.log('=' .repeat(40));
    console.log(`✅ Quality: ${quality.quality} (${quality.confidence}% confidence)`);
    console.log(`📊 Word Count: ${quality.wordCount}`);
    console.log(`🔑 Resume Keywords Found: ${quality.keywordsFound}`);
    
    if (quality.issues.length > 0) {
      console.log(`⚠️  Issues: ${quality.issues.join(', ')}`);
    }
    
    console.log('\n🎉 OCR DEMONSTRATION COMPLETE!');
    console.log('Step 5: OCR Implementation is working successfully! 🚀');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

demonstrateOCR().catch(console.error);
