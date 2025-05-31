#!/usr/bin/env node

const TextExtractor = require('./src/utils/textExtractor');

/**
 * Quick test to verify clean text output
 */
async function quickCleanTest() {
  console.log('🧹 Quick Clean OCR Test');
  console.log('========================');

  try {
    // Test with a text-based PDF first (should be fast)
    console.log('\n📄 Testing text-based extraction...');
    const textResult = await TextExtractor.extractText('./uploads/Resumes/Resume 8.pdf', 'pdf');
    
    console.log(`Method: ${textResult.metadata.extractionMethod}`);
    console.log(`Length: ${textResult.text.length} characters`);
    
    // Check for separators
    const hasPageSeps = textResult.text.includes('--- Page');
    const hasImageSeps = textResult.text.includes('--- Image');
    
    console.log(`Has page separators: ${hasPageSeps ? '❌ YES' : '✅ NO'}`);
    console.log(`Has image separators: ${hasImageSeps ? '❌ YES' : '✅ NO'}`);
    
    // Show sample
    console.log('\nSample text (first 150 chars):');
    console.log('"' + textResult.text.substring(0, 150) + '..."');
    
    if (textResult.metadata.extractionMethod === 'text') {
      console.log('\n✅ Text-based extraction is clean!');
    }

    console.log('\n📊 Testing OCR with a simple image...');
    // Create a simple test by forcing OCR on a DOCX
    const docxResult = await TextExtractor.extractDOCXWithOCR('./uploads/Resumes/Resume 10.docx');
    
    console.log(`OCR Length: ${docxResult.text.length} characters`);
    console.log(`OCR Confidence: ${docxResult.confidence.toFixed(1)}%`);
    
    // Check for separators in OCR output
    const ocrHasPageSeps = docxResult.text.includes('--- Page');
    const ocrHasImageSeps = docxResult.text.includes('--- Image');
    
    console.log(`OCR has page separators: ${ocrHasPageSeps ? '❌ YES' : '✅ NO'}`);
    console.log(`OCR has image separators: ${ocrHasImageSeps ? '❌ YES' : '✅ NO'}`);
    
    // Show OCR sample
    console.log('\nOCR Sample text (first 150 chars):');
    console.log('"' + docxResult.text.substring(0, 150) + '..."');
    
    if (!ocrHasPageSeps && !ocrHasImageSeps) {
      console.log('\n✅ OCR output is now clean and LLM-ready!');
    } else {
      console.log('\n❌ OCR still has separators - need to fix!');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

quickCleanTest();
