const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
    try {
        console.log('Creating test user...');

        // Hash password
        const hashedPassword = await bcrypt.hash('test123', 10);

        // Create business
        const business = await prisma.business.upsert({
            where: { id: 'test-business-id' },
            update: {},
            create: {
                id: 'test-business-id',
                name: 'Test Business',
                type: 'general',
                phone: '+1234567890',
                plan: 'PRO',
                planStartedAt: new Date(),
                planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
        });

        console.log('Business created:', business.name);

        // Create user
        const user = await prisma.user.upsert({
            where: { email: 'test@example.com' },
            update: {},
            create: {
                email: 'test@example.com',
                name: 'Test User',
                password: hashedPassword,
                businessId: business.id,
                role: 'OWNER',
                isActive: true,
            },
        });

        console.log('✅ Test user created successfully!');
        console.log('\n========================================');
        console.log('LOGIN CREDENTIALS:');
        console.log('========================================');
        console.log('Email:    test@example.com');
        console.log('Password: test123');
        console.log('========================================\n');

    } catch (error) {
        console.error('Error creating test user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTestUser();
