// Seed script - creates a demo user & business
// Run: node scripts/seed-user.js

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'bizzautoai.solution@gmail.com';
  const password = 'Admin@123456';
  const name = 'Demo User';

  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('User already exists:', existing.email);
    await prisma.$disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Create business
  const business = await prisma.business.create({
    data: {
      name: 'BizzAuto Solutions',
      type: 'general',
      plan: 'PROFESSIONAL',
      email,
      phone: '+91 8983027975',
    },
  });

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'OWNER',
      businessId: business.id,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  console.log('✅ User created:', user.email, '(password: ' + password + ')');
  console.log('✅ Business created:', business.name);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
