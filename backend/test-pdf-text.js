#!/usr/bin/env node

const TextExtractor = require('./src/utils/textExtractor');
const fs = require('fs');
const path = require('path');

/**
 * Test PDF text extraction without OCR
 */
async function testPDFTextExtraction() {
    console.log('🔍 Testing PDF Text Extraction (Non-OCR)');
    console.log('============================================================');
    
    const uploadsDir = './uploads/Resumes';
    
    try {
        // Get PDF files
        const files = fs.readdirSync(uploadsDir);
        const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
        
        console.log(`📁 Found ${pdfFiles.length} PDF files`);
        
        for (const file of pdfFiles.slice(0, 3)) { // Test first 3 PDF files
            try {
                const startTime = Date.now();
                const filePath = path.join(uploadsDir, file);
                
                console.log(`\n🔍 Testing: ${file}`);
                console.log(`📊 File type: PDF`);
                
                const result = await TextExtractor.extractText(filePath, 'pdf');
                const processingTime = Date.now() - startTime;
                
                // Assess quality
                const quality = TextExtractor.assessTextQuality(result.text);
                
                console.log(`⏱️  Processing time: ${processingTime}ms`);
                console.log(`📝 Extracted text length: ${result.text.length} characters`);
                console.log(`🎯 Extraction method: ${result.metadata.extractionMethod || 'text'}`);
                console.log(`📄 PDF pages: ${result.metadata.pages}`);
                
                if (result.metadata.ocrConfidence !== undefined) {
                    console.log(`📈 OCR confidence: ${Math.round(result.metadata.ocrConfidence)}%`);
                }
                
                console.log(`✅ Quality: ${quality.quality} (${quality.confidence}% confidence)`);
                console.log(`📊 Word count: ${quality.wordCount}`);
                console.log(`🔑 Keywords found: ${quality.keywordsFound}`);
                
                if (quality.issues.length > 0) {
                    console.log(`⚠️  Issues: ${quality.issues.join(', ')}`);
                }
                
                // Show text preview (first 200 characters)
                const preview = result.text.substring(0, 200).replace(/\n/g, ' ').trim();
                console.log(`📖 Text preview: "${preview}${result.text.length > 200 ? '...' : ''}"`);
                
                if (result.metadata.extractionMethod === 'text') {
                    console.log('✅ SUCCESS - Text-based PDF');
                } else {
                    console.log('⚠️  Image-based PDF - OCR needed');
                }
                
            } catch (error) {
                console.error(`❌ Failed to process ${file}:`, error.message);
            }
        }

        console.log('\n🏁 PDF Text Extraction Summary');
        console.log('============================================================');
        console.log('ℹ️  This test shows which PDFs contain extractable text vs need OCR');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testPDFTextExtraction().catch(console.error);
