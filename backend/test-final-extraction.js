// Quick test for text-based PDF extraction
const TextExtractor = require('./src/utils/textExtractor');

async function testTextPDF() {
  try {
    console.log('🧪 Testing Text-based PDF (if available)');
    console.log('==========================================\n');
    
    // Create a simple text-based test
    const testResult = await TextExtractor.extractText('./uploads/Resumes/Resume 8.pdf', 'pdf');
    
    console.log('📊 RESULT:');
    console.log(`🎯 Method: ${testResult.metadata.extractionMethod}`);
    console.log(`📝 Length: ${testResult.text.length} characters`);
    if (testResult.metadata.ocrConfidence) {
      console.log(`📈 OCR Confidence: ${testResult.metadata.ocrConfidence.toFixed(1)}%`);
    }
    
    console.log('\n✅ Text extraction working properly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTextPDF();
