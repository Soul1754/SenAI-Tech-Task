#!/usr/bin/env node

const TextExtractor = require('./src/utils/textExtractor');

/**
 * Test that OCR produces clean, continuous text for LLM processing
 */
async function testCleanOCR() {
  console.log('🧹 Testing Clean OCR Output for LLM Processing');
  console.log('=' .repeat(50));

  const testFiles = [
    { path: './uploads/Resumes/Resume 1.pdf', type: 'pdf', name: 'Resume 1 (PDF)' },
    { path: './uploads/Resumes/Resume 10.docx', type: 'docx', name: 'Resume 10 (DOCX)' }
  ];

  for (const { path, type, name } of testFiles) {
    try {
      console.log(`\n📄 Testing ${name}...`);
      console.log('-'.repeat(30));

      const result = await TextExtractor.extractText(path, type);
      
      console.log(`🎯 Method: ${result.metadata.extractionMethod}`);
      console.log(`📝 Length: ${result.text.length} characters`);
      
      if (result.metadata.ocrConfidence) {
        console.log(`📈 OCR Confidence: ${result.metadata.ocrConfidence.toFixed(1)}%`);
      }

      // Check for unwanted separators
      const hasPageSeparators = result.text.includes('--- Page');
      const hasImageSeparators = result.text.includes('--- Image');
      
      console.log(`🚫 Has page separators: ${hasPageSeparators ? '❌ YES' : '✅ NO'}`);
      console.log(`🚫 Has image separators: ${hasImageSeparators ? '❌ YES' : '✅ NO'}`);

      // Show first 200 characters as a sample
      console.log('\n📖 Sample text (first 200 chars):');
      console.log('="'.repeat(25));
      console.log(result.text.substring(0, 200) + '...');
      console.log('="'.repeat(25));

      // Count line breaks and check text quality
      const lineBreaks = (result.text.match(/\n/g) || []).length;
      const words = result.text.split(/\s+/).filter(word => word.length > 0).length;
      
      console.log(`\n📊 Text Quality:`)
      console.log(`   • Line breaks: ${lineBreaks}`);
      console.log(`   • Word count: ${words}`);
      console.log(`   • Avg words per line: ${lineBreaks > 0 ? (words / lineBreaks).toFixed(1) : 'N/A'}`);

      if (!hasPageSeparators && !hasImageSeparators) {
        console.log('✅ Text is clean and ready for LLM processing!');
      } else {
        console.log('❌ Text contains separators that may interfere with LLM processing!');
      }

    } catch (error) {
      console.error(`❌ Error testing ${name}:`, error.message);
    }
  }
  
  console.log('\n🏁 Clean OCR test completed!');
}

testCleanOCR();
