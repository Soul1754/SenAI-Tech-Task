const { prisma } = require('../config/config');

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test if tables exist by doing a simple query
    const userCount = await prisma.user.count();
    console.log(`✅ User table accessible (count: ${userCount})`);
    
    const resumeCount = await prisma.resume.count();
    console.log(`✅ Resume table accessible (count: ${resumeCount})`);
    
    const skillCount = await prisma.skill.count();
    console.log(`✅ Skill table accessible (count: ${skillCount})`);
    
    console.log('✅ All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { testDatabaseConnection };

// Run test if this file is executed directly
if (require.main === module) {
  testDatabaseConnection()
    .then(() => {
      console.log('Database test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database test failed:', error);
      process.exit(1);
    });
}
