import { prisma } from './src/server/db.ts';

async function testConnection() {
  try {
    // Test basic connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`✅ User count query successful: ${userCount} users`);
    
    // Test creating and deleting a test user (in a transaction)
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        role: 'MEMBER'
      }
    });
    
    console.log(`✅ Test user created: ${testUser.id}`);
    
    // Clean up
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    
    console.log('✅ Test user deleted');
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  }
}

testConnection();