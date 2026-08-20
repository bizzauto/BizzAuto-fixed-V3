import { hashPassword, comparePassword, generateToken, verifyToken } from './src/server/utils/auth.ts';

async function testAuthUtils() {
  try {
    console.log('Testing authentication utilities...');
    
    // Test password hashing
    const password = 'TestPassword123!';
    const hashed = await hashPassword(password);
    console.log('✅ Password hashing successful');
    
    // Test password comparison
    const match = await comparePassword(password, hashed);
    if (!match) throw new Error('Password comparison failed');
    console.log('✅ Password comparison successful');
    
    // Test wrong password
    const wrongMatch = await comparePassword('WrongPassword', hashed);
    if (wrongMatch) throw new Error('Wrong password incorrectly matched');
    console.log('✅ Wrong password rejection successful');
    
    // Test token generation
    const payload = { userId: 'test-user-123', email: 'test@example.com' };
    const token = generateToken(payload);
    console.log('✅ Token generation successful');
    
    // Test token verification
    const decoded = verifyToken(token);
    if (!decoded || decoded.userId !== 'test-user-123') {
      throw new Error('Token verification failed');
    }
    console.log('✅ Token verification successful');
    
    // Test invalid token
    try {
      verifyToken('invalid.token.here');
      throw new Error('Invalid token should have thrown an error');
    } catch (error) {
      if (!error.message.includes('Invalid token')) throw error;
      console.log('✅ Invalid token rejection successful');
    }
    
    console.log('🎉 All authentication tests passed!');
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    process.exit(1);
  }
}

testAuthUtils();