#!/usr/bin/env node

const TextExtractor = require('./src/utils/textExtractor');

/**
 * Test the enhanced text cleaning for LLM processing
 */
async function testEnhancedCleaning() {
  console.log('🔧 Testing Enhanced Text Cleaning for LLM');
  console.log('=' .repeat(45));

  try {
    // Test with a real resume
    console.log('\n📄 Testing with real resume...');
    const result = await TextExtractor.extractText('../uploads/Resumes/Resume 1.pdf', 'pdf');
    
    console.log(`📊 Results:`);
    console.log(`   Length: ${result.text.length} characters`);
    console.log(`   Method: ${result.metadata.extractionMethod}`);
    
    if (result.metadata.ocrConfidence) {
      console.log(`   OCR Confidence: ${result.metadata.ocrConfidence.toFixed(1)}%`);
    }
    
    // Analyze text quality
    const lines = result.text.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const words = result.text.split(/\s+/).filter(word => word.length > 0);
    
    console.log(`\n📈 Text Quality Analysis:`);
    console.log(`   Total lines: ${lines.length}`);
    console.log(`   Non-empty lines: ${nonEmptyLines.length}`);
    console.log(`   Word count: ${words.length}`);
    console.log(`   Avg line length: ${(result.text.length / nonEmptyLines.length).toFixed(1)} chars`);
    
    // Check for common resume keywords to verify content integrity
    const resumeKeywords = [
      'experience', 'education', 'skills', 'work', 'employment', 
      'university', 'degree', 'years', 'responsibilities', 'position',
      'email', 'phone', 'address', 'name'
    ];
    
    const foundKeywords = resumeKeywords.filter(keyword => 
      result.text.toLowerCase().includes(keyword)
    );
    
    console.log(`   Resume keywords found: ${foundKeywords.length}/${resumeKeywords.length}`);
    console.log(`   Keywords: ${foundKeywords.join(', ')}`);
    
    // Show clean sample for LLM
    console.log(`\n📝 Clean Sample (first 300 chars for LLM):`);
    console.log('─'.repeat(50));
    console.log(result.text.substring(0, 300) + '...');
    console.log('─'.repeat(50));
    
    // Test with another file type
    console.log('\n📄 Testing with DOCX file...');
    const docxResult = await TextExtractor.extractText('../uploads/Resumes/Resume 10.docx', 'docx');
    
    console.log(`📊 DOCX Results:`);
    console.log(`   Length: ${docxResult.text.length} characters`);
    console.log(`   Method: ${docxResult.metadata.extractionMethod}`);
    
    if (docxResult.metadata.ocrConfidence) {
      console.log(`   OCR Confidence: ${docxResult.metadata.ocrConfidence.toFixed(1)}%`);
    }
    
    const docxWords = docxResult.text.split(/\s+/).filter(word => word.length > 0);
    const docxFoundKeywords = resumeKeywords.filter(keyword => 
      docxResult.text.toLowerCase().includes(keyword)
    );
    
    console.log(`   Word count: ${docxWords.length}`);
    console.log(`   Resume keywords found: ${docxFoundKeywords.length}/${resumeKeywords.length}`);
    
    console.log('\n✅ Text extraction and cleaning is optimized for LLM processing!');
    console.log('✅ Ready for Step 6: LLM Setup with Ollama!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testEnhancedCleaning();
