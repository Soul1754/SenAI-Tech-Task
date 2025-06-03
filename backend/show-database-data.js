const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function showDatabaseData() {
  try {
    console.log('🗄️  RESUME DATABASE STORAGE ANALYSIS');
    console.log('=' .repeat(70));
    
    // Get all resumes with their structured data
    const resumes = await prisma.resume.findMany({
      orderBy: { uploadedAt: 'desc' },
      take: 5, // Show last 5 resumes
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log(`\n📊 Found ${resumes.length} resumes in database:\n`);

    for (let i = 0; i < resumes.length; i++) {
      const resume = resumes[i];
      
      console.log(`🔹 Resume ${i + 1}: ${resume.originalFileName}`);
      console.log(`   ID: ${resume.id}`);
      console.log(`   Status: ${resume.status}`);
      console.log(`   File Type: ${resume.fileType}`);
      console.log(`   Uploaded: ${resume.uploadedAt.toISOString().split('T')[0]}`);
      console.log(`   Uploaded by: ${resume.user?.email || 'Unknown'}`);
      
      // Show structured data if available
      if (resume.structuredData) {
        console.log(`\n   📋 STRUCTURED DATA STORED:`);
        
        const data = resume.structuredData;
        
        // Personal Info
        if (data.personal_info) {
          console.log(`   👤 Personal Info:`);
          console.log(`      Name: ${data.personal_info.name || 'Not found'}`);
          console.log(`      Email: ${data.personal_info.email || 'Not found'}`);
          console.log(`      Phone: ${data.personal_info.phone || 'Not found'}`);
          console.log(`      Address: ${data.personal_info.address || 'Not found'}`);
          console.log(`      LinkedIn: ${data.personal_info.linkedin || 'Not found'}`);
        }
        
        // Summary
        if (data.summary) {
          console.log(`   📝 Summary: ${data.summary.substring(0, 100)}...`);
        }
        
        // Skills
        if (data.skills && data.skills.length > 0) {
          console.log(`   🛠️  Skills (${data.skills.length}): ${data.skills.slice(0, 8).join(', ')}${data.skills.length > 8 ? '...' : ''}`);
        }
        
        // Experience
        if (data.experience && data.experience.length > 0) {
          console.log(`   💼 Work Experience (${data.experience.length} positions):`);
          data.experience.slice(0, 2).forEach((exp, idx) => {
            console.log(`      ${idx + 1}. ${exp.position || 'Unknown'} at ${exp.company || 'Unknown'}`);
            console.log(`         Duration: ${exp.start_date || 'Unknown'} - ${exp.end_date || 'Present'}`);
          });
        }
        
        // Education
        if (data.education && data.education.length > 0) {
          console.log(`   🎓 Education (${data.education.length} entries):`);
          data.education.forEach((edu, idx) => {
            console.log(`      ${idx + 1}. ${edu.degree || 'Unknown'} in ${edu.field || 'Unknown'}`);
            console.log(`         Institution: ${edu.institution || 'Unknown'}`);
          });
        }
        
        // Certifications
        if (data.certifications && data.certifications.length > 0) {
          console.log(`   🏆 Certifications (${data.certifications.length}): ${data.certifications.join(', ')}`);
        }
        
      } else {
        console.log(`   ⚠️  No structured data stored`);
      }
      
      // Show metadata if available
      if (resume.metadata) {
        console.log(`\n   🔧 PROCESSING METADATA:`);
        const meta = resume.metadata;
        if (meta.extraction_method) console.log(`      Extraction Method: ${meta.extraction_method}`);
        if (meta.processing_time) console.log(`      Processing Time: ${meta.processing_time}s`);
        if (meta.text_length) console.log(`      Text Length: ${meta.text_length} chars`);
        if (meta.word_count) console.log(`      Word Count: ${meta.word_count} words`);
      }
      
      console.log('\n' + '-'.repeat(70) + '\n');
    }
    
    // Show database statistics
    console.log('📈 DATABASE STATISTICS:');
    console.log('=' .repeat(70));
    
    const totalResumes = await prisma.resume.count();
    const completedResumes = await prisma.resume.count({
      where: { status: 'COMPLETED' }
    });
    const resumesWithStructuredData = await prisma.resume.count({
      where: { 
        structuredData: { not: null }
      }
    });
    
    console.log(`Total Resumes: ${totalResumes}`);
    console.log(`Completed Processing: ${completedResumes}`);
    console.log(`With Structured Data: ${resumesWithStructuredData}`);
    console.log(`Success Rate: ${totalResumes > 0 ? ((resumesWithStructuredData / totalResumes) * 100).toFixed(1) : 0}%`);
    
    // Show database table structure
    console.log('\n🏗️  DATABASE TABLE STRUCTURE:');
    console.log('=' .repeat(70));
    console.log('Table: resumes');
    console.log('Key fields for resume data storage:');
    console.log('  • id (Primary Key)');
    console.log('  • originalFileName (String)');
    console.log('  • status (Enum: PENDING, PROCESSING, COMPLETED, etc.)');
    console.log('  • extractedText (String) - Raw text from PDF/DOCX');
    console.log('  • structuredData (JSON) - LLM extracted structured data');
    console.log('  • metadata (JSON) - Processing metadata & performance');
    console.log('  • uploadedBy (Foreign Key to User)');
    console.log('  • uploadedAt (DateTime)');
    
    console.log('\n📱 To view in GUI: Prisma Studio is running at http://localhost:5555');
    
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
showDatabaseData();
