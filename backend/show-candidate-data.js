const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function showCandidateData() {
  console.log('🎯 Candidate Database Summary');
  console.log('============================\n');

  try {
    // Get all candidates with their related data
    const candidates = await prisma.candidate.findMany({
      include: {
        resume: true,
        skills: {
          include: {
            skill: true
          }
        },
        workExperience: true,
        education: true,
        certifications: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total Candidates: ${candidates.length}\n`);

    candidates.forEach((candidate, index) => {
      console.log(`👤 Candidate ${index + 1}: ${candidate.fullName}`);
      console.log(`   ID: ${candidate.id}`);
      console.log(`   Email: ${candidate.email || 'Not provided'}`);
      console.log(`   Phone: ${candidate.phone || 'Not provided'}`);
      console.log(`   Location: ${candidate.location || 'Not provided'}`);
      console.log(`   Years Experience: ${candidate.yearsExperience}`);
      console.log(`   Status: ${candidate.status}`);
      console.log(`   Resume: ${candidate.resume.originalFileName}`);
      console.log(`   Created: ${candidate.createdAt.toISOString().split('T')[0]}`);
      
      console.log(`\n   💼 Work Experience (${candidate.workExperience.length}):`);
      candidate.workExperience.forEach((exp, i) => {
        const startDate = exp.startDate ? exp.startDate.toISOString().split('T')[0] : 'Unknown';
        const endDate = exp.isCurrent ? 'Present' : (exp.endDate ? exp.endDate.toISOString().split('T')[0] : 'Unknown');
        console.log(`     ${i + 1}. ${exp.position} at ${exp.company} (${startDate} - ${endDate})`);
      });

      console.log(`\n   🎓 Education (${candidate.education.length}):`);
      candidate.education.forEach((edu, i) => {
        console.log(`     ${i + 1}. ${edu.degree} in ${edu.field || 'Unknown Field'} from ${edu.institution}`);
        console.log(`        Years: ${edu.startYear || 'Unknown'} - ${edu.endYear || 'Unknown'}`);
        if (edu.gpa) console.log(`        GPA: ${edu.gpa}`);
      });

      console.log(`\n   🛠️  Skills (${candidate.skills.length}):`);
      const skillsByCategory = candidate.skills.reduce((acc, skillRel) => {
        const category = skillRel.skill.category;
        if (!acc[category]) acc[category] = [];
        acc[category].push(skillRel.skill.name);
        return acc;
      }, {});

      Object.entries(skillsByCategory).forEach(([category, skills]) => {
        console.log(`     ${category}: ${skills.join(', ')}`);
      });

      console.log(`\n   📜 Certifications (${candidate.certifications.length}):`);
      candidate.certifications.forEach((cert, i) => {
        console.log(`     ${i + 1}. ${cert.name} from ${cert.issuer}`);
        if (cert.issueDate) console.log(`        Issued: ${cert.issueDate.toISOString().split('T')[0]}`);
        if (cert.expiryDate) console.log(`        Expires: ${cert.expiryDate.toISOString().split('T')[0]}`);
      });

      console.log('\n' + '─'.repeat(80) + '\n');
    });

    // Show skill statistics
    const allSkills = await prisma.skill.findMany({
      include: {
        candidateSkills: true
      }
    });

    console.log('📈 Skill Statistics:');
    console.log(`   Total unique skills: ${allSkills.length}`);

    const skillsByCategory = allSkills.reduce((acc, skill) => {
      const category = skill.category;
      if (!acc[category]) acc[category] = 0;
      acc[category]++;
      return acc;
    }, {});

    Object.entries(skillsByCategory).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} skills`);
    });

    console.log('\n🏆 Most Popular Skills:');
    const popularSkills = allSkills
      .map(skill => ({
        name: skill.name,
        category: skill.category,
        candidateCount: skill.candidateSkills.length
      }))
      .filter(skill => skill.candidateCount > 0)
      .sort((a, b) => b.candidateCount - a.candidateCount)
      .slice(0, 10);

    popularSkills.forEach((skill, i) => {
      console.log(`   ${i + 1}. ${skill.name} (${skill.category}) - ${skill.candidateCount} candidate(s)`);
    });

  } catch (error) {
    console.error('❌ Error retrieving candidate data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the summary
showCandidateData()
  .then(() => {
    console.log('\n✅ Candidate data summary completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Summary failed:', error);
    process.exit(1);
  });
