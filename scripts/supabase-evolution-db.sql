-- ==============================================
-- Supabase: Create a Separate Schema for Evolution API
-- ==============================================
-- Run this in Supabase SQL Editor (one option at a time)
-- 
-- Evolution API uses its own table names (Instances, Messages, Chats, etc.)
-- which DON'T conflict with BizzAuto app tables (wa_instances, wa_messages, etc.)
-- So a separate schema is optional but recommended for organization.

-- ==============================================
-- OPTION 1: Create a dedicated schema (Recommended)
-- ==============================================
-- This keeps Evolution tables separate from app tables
CREATE SCHEMA IF NOT EXISTS evolution;

-- Grant permissions
GRANT USAGE ON SCHEMA evolution TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA evolution TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA evolution TO postgres;

-- ==============================================
-- OPTION 2: Create a dedicated database (Supabase Pro+)
-- ==============================================
-- Note: Supabase free tier only allows 1 database per project.
-- This requires at least Pro plan.
-- CREATE DATABASE evolution_db;

-- ==============================================
-- Verify
-- ==============================================
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'evolution';

-- ==============================================
-- Set EVOLUTION_DATABASE_URL in Coolify
-- ==============================================
-- After running Option 1, set this env var in Coolify:
-- 
-- ⚠️  Important: Use URL-encoded search_path (NOT Prisma-style ?schema=)
--    Evolution API uses a raw PostgreSQL driver that doesn't understand ?schema=
--    PostgreSQL raw connection string with search_path:
--    EVOLUTION_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?options=-c%20search_path=evolution
--
-- 💡 But honestly? Evolution API tables are named DIFFERENTLY from app tables:
--    Evolution: Instances, Messages, Chats
--    App:       wa_instances, wa_messages, wa_chats
--    So there is NO naming conflict. Separate schema is purely optional.
--
-- Replace [PASSWORD] and [HOST] with your actual Supabase credentials
-- Or just skip EVOLUTION_DATABASE_URL entirely — it defaults to app's DATABASE_URL
