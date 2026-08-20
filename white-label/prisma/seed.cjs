// Seed script for white-label database
// Run: node prisma/seed.cjs
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding white-label database...");

  // Check if demo reseller already exists
  const existing = await prisma.wlReseller.findUnique({
    where: { email: "demo@reseller.com" },
  });

  if (existing) {
    console.log("ℹ️  Demo reseller already exists, skipping...");
    const count = await prisma.wlReseller.count();
    const clientCount = await prisma.wlClient.count();
    console.log(`📊 Resellers: ${count}, Clients: ${clientCount}`);
    return;
  }

  // Create demo reseller
  const hashedPassword = await bcrypt.hash("demo123", 10);
  const reseller = await prisma.wlReseller.create({
    data: {
      name: "Rahul Sharma",
      email: "demo@reseller.com",
      password: hashedPassword,
      company: "My Digital Agency",
      plan: "PRO",
      domain: "tools.myagency.com",
      primaryColor: "#6366f1",
      revenue: 45000,
    },
  });

  console.log(`✅ Created reseller: ${reseller.name} (${reseller.email})`);

  // Create demo clients
  const clients = [
    { name: "City Restaurant", email: "info@cityrest.com", phone: "+91-9876543210", product: "google-reviews", status: "active", plan: "PRO" },
    { name: "Dr. Patel Clinic", email: "drpatel@clinic.com", phone: "+91-8765432109", product: "digital-vcard", status: "active", plan: "STARTER" },
    { name: "Green Mart Store", email: "info@greenmart.com", phone: "+91-7654321098", product: "website-builder", status: "active", plan: "PRO" },
    { name: "Pune Fitness Hub", email: "contact@punefitness.com", phone: "+91-6543210987", product: "google-reviews", status: "pending", plan: "STARTER" },
    { name: "Sharma Law Office", email: "sharma@lawfirm.com", phone: "+91-5432109876", product: "website-builder", status: "active", plan: "PRO" },
  ];

  for (const client of clients) {
    await prisma.wlClient.create({
      data: {
        ...client,
        resellerId: reseller.id,
      },
    });
  }

  console.log(`✅ Created ${clients.length} demo clients`);
  console.log(`\n📋 Demo login:`);
  console.log(`   Email:    demo@reseller.com`);
  console.log(`   Password: demo123`);
  console.log(`\n🌱 Seeding complete!`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
