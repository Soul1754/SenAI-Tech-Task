// Test DOCX OCR specifically
const TextExtractor = require('./src/utils/textExtractor');
const path = require('path');

async function testDocxOCR() {
  try {
    console.log('🧪 Testing DOCX OCR Implementation');
    console.log('=====================================\n');
    
    const docxPath = './uploads/Resumes/Resume 10.docx';
    console.log(`📄 Testing: ${docxPath}`);
    
    const startTime = Date.now();
    const result = await TextExtractor.extractFromDOCX(docxPath);
    const endTime = Date.now();
    
    console.log('\n📊 RESULTS:');
    console.log('============');
    console.log(`⏱️  Time: ${endTime - startTime}ms`);
    console.log(`📝 Text Length: ${result.text.length} characters`);
    console.log(`🎯 Method: ${result.metadata.extractionMethod}`);
    if (result.metadata.ocrConfidence) {
      console.log(`📈 OCR Confidence: ${result.metadata.ocrConfidence.toFixed(1)}%`);
    }
    
    console.log('\n📖 TEXT PREVIEW:');
    console.log('=================');
    console.log(result.text.substring(0, 500) + '...');
    
    // Quality check
    const words = result.text.split(/\s+/).filter(word => word.length > 0);
    const resumeKeywords = ['experience', 'skills', 'education', 'work', 'job', 'resume', 'candidate', 'professional', 'technical', 'project'];
    const foundKeywords = resumeKeywords.filter(keyword => 
      result.text.toLowerCase().includes(keyword.toLowerCase())
    );
    
    console.log('\n🔍 QUALITY ASSESSMENT:');
    console.log('=======================');
    console.log(`📊 Word Count: ${words.length}`);
    console.log(`🔑 Resume Keywords Found: ${foundKeywords.length}`);
    
    if (result.metadata.extractionMethod === 'ocr' && result.metadata.ocrConfidence > 80) {
      console.log('\n✅ DOCX OCR TEST PASSED! High confidence text extraction.');
    } else if (result.metadata.extractionMethod === 'text') {
      console.log('\n✅ DOCX TEXT EXTRACTION PASSED! Good text-based extraction.');
    } else {
      console.log('\n⚠️  DOCX extraction completed but with low confidence.');
    }
    
  } catch (error) {
    console.error('❌ DOCX OCR Test Failed:', error.message);
  }
}

testDocxOCR();
