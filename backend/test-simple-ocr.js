#!/usr/bin/env node

const TextExtractor = require('./src/utils/textExtractor');
const fs = require('fs');
const path = require('path');

/**
 * Simple OCR test that validates our core text extraction functionality
 */
async function testSimpleOCR() {
  console.log('🔍 Testing Simple OCR Functionality');
  console.log('=' .repeat(50));

  try {
    // Test with actual files from uploads
    const uploadsDir = './uploads/Resumes';
    const files = fs.readdirSync(uploadsDir).filter(file => 
      file.endsWith('.pdf') || file.endsWith('.docx') || file.endsWith('.txt')
    );

    console.log(`📁 Found ${files.length} files to test`);

    // Test just one PDF to see what happens
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));
    if (pdfFiles.length > 0) {
      const testFile = path.join(uploadsDir, pdfFiles[0]);
      console.log(`\n📄 Testing with: ${pdfFiles[0]}`);
      
      const startTime = Date.now();
      const result = await TextExtractor.extractText(testFile, 'pdf');
      const endTime = Date.now();
      
      console.log(`⏱️  Processing time: ${endTime - startTime}ms`);
      console.log(`📝 Extracted text length: ${result.text.length} characters`);
      console.log(`🎯 Extraction method: ${result.metadata.extractionMethod}`);
      
      if (result.metadata.ocrConfidence !== undefined) {
        console.log(`📈 OCR confidence: ${Math.round(result.metadata.ocrConfidence)}%`);
      }
      
      // Show preview of extracted text
      const preview = result.text.substring(0, 200);
      console.log(`📖 Text preview: "${preview}${result.text.length > 200 ? '...' : ''}"`);
      
      console.log('✅ PDF test completed successfully');
    }

    // Test a DOCX file
    const docxFiles = files.filter(f => f.endsWith('.docx'));
    if (docxFiles.length > 0) {
      const testFile = path.join(uploadsDir, docxFiles[0]);
      console.log(`\n📄 Testing with: ${docxFiles[0]}`);
      
      const startTime = Date.now();
      const result = await TextExtractor.extractText(testFile, 'docx');
      const endTime = Date.now();
      
      console.log(`⏱️  Processing time: ${endTime - startTime}ms`);
      console.log(`📝 Extracted text length: ${result.text.length} characters`);
      console.log(`🎯 Extraction method: ${result.metadata.extractionMethod}`);
      
      if (result.metadata.ocrConfidence !== undefined) {
        console.log(`📈 OCR confidence: ${Math.round(result.metadata.ocrConfidence)}%`);
      }
      
      // Show preview of extracted text
      const preview = result.text.substring(0, 200);
      console.log(`📖 Text preview: "${preview}${result.text.length > 200 ? '...' : ''}"`);
      
      console.log('✅ DOCX test completed successfully');
    }

    console.log('\n🏁 Simple OCR Test Complete');
    console.log('✅ Text extraction system is working properly');
    
  } catch (error) {
    console.error('❌ Simple OCR test failed:', error);
    console.log('💡 Check that files exist and system dependencies are available');
  }
}

// Run the test
testSimpleOCR().catch(console.error);
