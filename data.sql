-- 1. Enums banva
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE "Plan" AS ENUM ('FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'AGENCY');

-- 2. Business Table (Sagle relations yaaver avalambun aahet)
CREATE TABLE "Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. User Table
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "password" TEXT,
    "role" "Role" NOT NULL DEFAULT 'OWNER',
    "businessId" TEXT REFERENCES "Business"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Contacts (CRM Contacts)
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "source" TEXT DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
