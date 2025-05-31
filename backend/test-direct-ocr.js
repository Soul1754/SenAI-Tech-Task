#!/usr/bin/env node

const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Test direct OCR with a simple generated image
 */
async function testDirectOCR() {
    console.log('🔍 Testing Direct OCR with Generated Image');
    console.log('=' .repeat(50));

    let worker;
    try {
        // Create a simple test image with text
        const testImagePath = path.join(__dirname, 'test-image.png');
        
        // Generate a simple text image using Sharp
        const svg = `
        <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="white"/>
            <text x="50" y="100" font-family="Arial" font-size="24" fill="black">
                John Doe
            </text>
            <text x="50" y="150" font-family="Arial" font-size="18" fill="black">
                Software Engineer
            </text>
            <text x="50" y="200" font-family="Arial" font-size="16" fill="black">
                Email: john.doe@example.com
            </text>
            <text x="50" y="250" font-family="Arial" font-size="16" fill="black">
                Phone: (555) 123-4567
            </text>
            <text x="50" y="300" font-family="Arial" font-size="16" fill="black">
                Experience: 5 years in web development
            </text>
            <text x="50" y="350" font-family="Arial" font-size="16" fill="black">
                Skills: JavaScript, React, Node.js
            </text>
            <text x="50" y="400" font-family="Arial" font-size="16" fill="black">
                Education: Bachelor's in Computer Science
            </text>
        </svg>`;

        await sharp(Buffer.from(svg))
            .png()
            .toFile(testImagePath);

        console.log('✅ Test image created:', testImagePath);

        // Initialize Tesseract worker
        worker = await Tesseract.createWorker('eng');
        console.log('✅ Tesseract worker initialized');

        // Run OCR on the test image
        console.log('🔍 Running OCR on test image...');
        const { data: { text, confidence } } = await worker.recognize(testImagePath);

        console.log('\n📊 OCR Results:');
        console.log('─'.repeat(40));
        console.log(`📈 Confidence: ${Math.round(confidence)}%`);
        console.log(`📝 Text Length: ${text.length} characters`);
        console.log(`📖 Extracted Text:`);
        console.log(text);
        console.log('─'.repeat(40));

        // Clean up test image
        if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
            console.log('🧹 Test image cleaned up');
        }

        if (confidence > 50) {
            console.log('✅ OCR test PASSED - Good text recognition');
        } else {
            console.log('⚠️  OCR test WARNING - Low confidence but functional');
        }

    } catch (error) {
        console.error('❌ Direct OCR test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (worker) {
            try {
                await worker.terminate();
                console.log('✅ Worker terminated successfully');
            } catch (terminateError) {
                console.error('❌ Error terminating worker:', terminateError.message);
            }
        }
    }
}

// Run the test
testDirectOCR().catch(console.error);
