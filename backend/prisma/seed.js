const { prisma } = require('../src/config/config');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@senai.com' },
      update: {},
      create: {
        email: 'admin@senai.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      },
    });
    console.log('✅ Admin user created');

    // Create sample recruiter
    const recruiterPassword = await bcrypt.hash('recruiter123', 12);
    const recruiterUser = await prisma.user.upsert({
      where: { email: 'recruiter@senai.com' },
      update: {},
      create: {
        email: 'recruiter@senai.com',
        password: recruiterPassword,
        firstName: 'Jane',
        lastName: 'Recruiter',
        role: 'RECRUITER',
      },
    });
    console.log('✅ Sample recruiter created');

    // Seed skills
    const skillsData = [
      // Technical Skills
      { name: 'JavaScript', category: 'TECHNICAL' },
      { name: 'TypeScript', category: 'TECHNICAL' },
      { name: 'Python', category: 'TECHNICAL' },
      { name: 'Java', category: 'TECHNICAL' },
      { name: 'C++', category: 'TECHNICAL' },
      { name: 'Go', category: 'TECHNICAL' },
      { name: 'Rust', category: 'TECHNICAL' },
      { name: 'SQL', category: 'TECHNICAL' },
      { name: 'NoSQL', category: 'TECHNICAL' },
      { name: 'HTML', category: 'TECHNICAL' },
      { name: 'CSS', category: 'TECHNICAL' },
      
      // Frameworks
      { name: 'React', category: 'FRAMEWORK' },
      { name: 'Angular', category: 'FRAMEWORK' },
      { name: 'Vue.js', category: 'FRAMEWORK' },
      { name: 'Node.js', category: 'FRAMEWORK' },
      { name: 'Express.js', category: 'FRAMEWORK' },
      { name: 'Django', category: 'FRAMEWORK' },
      { name: 'Flask', category: 'FRAMEWORK' },
      { name: 'Spring Boot', category: 'FRAMEWORK' },
      { name: 'Laravel', category: 'FRAMEWORK' },
      { name: 'Rails', category: 'FRAMEWORK' },
      { name: 'Next.js', category: 'FRAMEWORK' },
      { name: 'Svelte', category: 'FRAMEWORK' },
      
      // Tools
      { name: 'Git', category: 'TOOL' },
      { name: 'Docker', category: 'TOOL' },
      { name: 'Kubernetes', category: 'TOOL' },
      { name: 'Jenkins', category: 'TOOL' },
      { name: 'AWS', category: 'TOOL' },
      { name: 'Azure', category: 'TOOL' },
      { name: 'Google Cloud', category: 'TOOL' },
      { name: 'Terraform', category: 'TOOL' },
      { name: 'Ansible', category: 'TOOL' },
      { name: 'Jira', category: 'TOOL' },
      { name: 'Slack', category: 'TOOL' },
      { name: 'Figma', category: 'TOOL' },
      { name: 'Adobe Creative Suite', category: 'TOOL' },
      
      // Databases
      { name: 'PostgreSQL', category: 'TECHNICAL' },
      { name: 'MySQL', category: 'TECHNICAL' },
      { name: 'MongoDB', category: 'TECHNICAL' },
      { name: 'Redis', category: 'TECHNICAL' },
      { name: 'Elasticsearch', category: 'TECHNICAL' },
      
      // Soft Skills
      { name: 'Leadership', category: 'SOFT_SKILL' },
      { name: 'Communication', category: 'SOFT_SKILL' },
      { name: 'Team Management', category: 'SOFT_SKILL' },
      { name: 'Project Management', category: 'SOFT_SKILL' },
      { name: 'Problem Solving', category: 'SOFT_SKILL' },
      { name: 'Critical Thinking', category: 'SOFT_SKILL' },
      { name: 'Agile Methodology', category: 'SOFT_SKILL' },
      { name: 'Scrum', category: 'SOFT_SKILL' },
      { name: 'Public Speaking', category: 'SOFT_SKILL' },
      { name: 'Mentoring', category: 'SOFT_SKILL' },
      
      // Languages
      { name: 'English', category: 'LANGUAGE' },
      { name: 'Spanish', category: 'LANGUAGE' },
      { name: 'French', category: 'LANGUAGE' },
      { name: 'German', category: 'LANGUAGE' },
      { name: 'Chinese', category: 'LANGUAGE' },
      { name: 'Japanese', category: 'LANGUAGE' },
      { name: 'Hindi', category: 'LANGUAGE' },
      { name: 'Arabic', category: 'LANGUAGE' },
      
      // Certifications
      { name: 'AWS Certified', category: 'CERTIFICATION' },
      { name: 'Google Cloud Certified', category: 'CERTIFICATION' },
      { name: 'Microsoft Azure Certified', category: 'CERTIFICATION' },
      { name: 'PMP', category: 'CERTIFICATION' },
      { name: 'Scrum Master', category: 'CERTIFICATION' },
      { name: 'CISSP', category: 'CERTIFICATION' },
      { name: 'CompTIA Security+', category: 'CERTIFICATION' },
    ];

    // Create skills in batches
    for (const skillData of skillsData) {
      await prisma.skill.upsert({
        where: { name: skillData.name },
        update: {},
        create: skillData,
      });
    }
    console.log(`✅ Created ${skillsData.length} skills`);

    // Create sample job
    const sampleJob = await prisma.job.create({
      data: {
        title: 'Senior Full Stack Developer',
        description: 'We are looking for a senior full stack developer to join our growing team.',
        requirements: 'Minimum 5 years of experience with React, Node.js, and PostgreSQL. Experience with cloud platforms is a plus.',
        department: 'Engineering',
        location: 'San Francisco, CA',
        salaryMin: 120000,
        salaryMax: 180000,
        experienceMin: 5,
        experienceMax: 10,
        isActive: true,
      },
    });
    console.log('✅ Sample job created');

    // Add required skills for the job
    const requiredSkills = ['React', 'Node.js', 'PostgreSQL', 'JavaScript', 'TypeScript'];
    const preferredSkills = ['AWS', 'Docker', 'Git'];
    
    for (const skillName of requiredSkills) {
      const skill = await prisma.skill.findUnique({ where: { name: skillName } });
      if (skill) {
        await prisma.jobSkill.create({
          data: {
            jobId: sampleJob.id,
            skillId: skill.id,
            importance: 'REQUIRED',
          },
        });
      }
    }
    
    for (const skillName of preferredSkills) {
      const skill = await prisma.skill.findUnique({ where: { name: skillName } });
      if (skill) {
        await prisma.jobSkill.create({
          data: {
            jobId: sampleJob.id,
            skillId: skill.id,
            importance: 'PREFERRED',
          },
        });
      }
    }
    console.log('✅ Job skills added');

    console.log('🎉 Database seeding completed successfully!');
    
    return {
      adminUser,
      recruiterUser,
      skillsCount: skillsData.length,
      sampleJob,
    };

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

module.exports = { seedDatabase };

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then((result) => {
      console.log('Seeding results:', {
        adminEmail: result.adminUser.email,
        recruiterEmail: result.recruiterUser.email,
        skillsCreated: result.skillsCount,
        jobTitle: result.sampleJob.title,
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
