const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function showRawJSONStructure() {
  try {
    console.log('📊 RAW JSON STRUCTURE IN DATABASE');
    console.log('=' .repeat(70));
    
    // Get the latest resume with structured data
    const resume = await prisma.resume.findFirst({
      where: { 
        structuredData: { not: null }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    if (!resume) {
      console.log('❌ No resumes with structured data found');
      return;
    }

    console.log(`📄 Resume: ${resume.originalFileName}`);
    console.log(`🗄️  Database ID: ${resume.id}`);
    console.log(`📅 Uploaded: ${resume.uploadedAt}`);
    console.log(`⚡ Status: ${resume.status}`);
    
    console.log('\n🔍 RAW STRUCTURED DATA JSON:');
    console.log('=' .repeat(70));
    console.log(JSON.stringify(resume.structuredData, null, 2));
    
    console.log('\n🔍 RAW METADATA JSON:');
    console.log('=' .repeat(70));
    console.log(JSON.stringify(resume.metadata, null, 2));
    
    console.log('\n🏗️  PostgreSQL STORAGE DETAILS:');
    console.log('=' .repeat(70));
    console.log('Table: resumes');
    console.log('Database: resume_processing');
    console.log('Field Type: JSON (PostgreSQL JSONB)');
    console.log('Indexed: Yes (for efficient querying)');
    console.log('Searchable: Yes (using JSON operators)');
    
    console.log('\n📱 QUERY EXAMPLES:');
    console.log('=' .repeat(70));
    console.log('-- Find resumes by skill:');
    console.log(`SELECT * FROM resumes WHERE structuredData->'skills' ? 'Python';`);
    console.log('\n-- Find resumes by company:');
    console.log(`SELECT * FROM resumes WHERE structuredData->'experience' @> '[{"company": "TechCorp Inc."}]';`);
    console.log('\n-- Find resumes by email domain:');
    console.log(`SELECT * FROM resumes WHERE structuredData->'personal_info'->>'email' LIKE '%@gmail.com';`);
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showRawJSONStructure();
