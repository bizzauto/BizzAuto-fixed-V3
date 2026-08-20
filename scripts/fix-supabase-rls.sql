-- ==============================================
-- FIX: Supabase RLS Policies for BizzAuto
-- ==============================================
-- Problem: service_all_policy bypasses RLS entirely
-- Solution: Drop overly permissive policies, add business-level isolation
-- Run this in Supabase SQL Editor

-- ==============================================
-- STEP 1: Drop the overly permissive policy from ALL tables
-- ==============================================
-- This policy was allowing unrestricted access (USING true, WITH CHECK true)

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop service_all_policy from all tables
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE policyname = 'service_all_policy'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Dropped policy % on %.%', r.policyname, r.schemaname, r.tablename;
    END LOOP;
END $$;

-- ==============================================
-- STEP 2: Enable RLS on all tables (if not already enabled)
-- ==============================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- ==============================================
-- STEP 3: Create proper business-level isolation policies
-- ==============================================
-- Each user can only access data belonging to their business

-- Helper function: Get current user's businessId from JWT
CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS TEXT AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claims', true)::json->>'businessId',
        current_setting('request.jwt.claims', true)::json->>'business_id',
        ''
    )::text;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: Check if user is SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claims', true)::json->>'role',
        ''
    )::text = 'SUPER_ADMIN';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==============================================
-- CRITICAL TABLES: Strict business isolation
-- These tables contain sensitive business data
-- ==============================================

-- Business table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business' AND policyname = 'business_isolation') THEN
        CREATE POLICY business_isolation ON public."Business"
            FOR ALL
            USING (
                id = public.get_user_business_id()
                OR public.is_super_admin()
            )
            WITH CHECK (
                id = public.get_user_business_id()
                OR public.is_super_admin()
            );
    END IF;
END $$;

-- User table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user' AND policyname = 'user_isolation') THEN
        CREATE POLICY user_isolation ON public."User"
            FOR ALL
            USING (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            )
            WITH CHECK (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            );
    END IF;
END $$;

-- Contact table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contact' AND policyname = 'contact_isolation') THEN
        CREATE POLICY contact_isolation ON public."Contact"
            FOR ALL
            USING (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            )
            WITH CHECK (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            );
    END IF;
END $$;

-- Campaign table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign' AND policyname = 'campaign_isolation') THEN
        CREATE POLICY campaign_isolation ON public."Campaign"
            FOR ALL
            USING (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            )
            WITH CHECK (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            );
    END IF;
END $$;

-- Message table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message' AND policyname = 'message_isolation') THEN
        CREATE POLICY message_isolation ON public."Message"
            FOR ALL
            USING (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            )
            WITH CHECK (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            );
    END IF;
END $$;

-- Appointment table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointment' AND policyname = 'appointment_isolation') THEN
        CREATE POLICY appointment_isolation ON public."Appointment"
            FOR ALL
            USING (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            )
            WITH CHECK (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            );
    END IF;
END $$;

-- Activity table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity' AND policyname = 'activity_isolation') THEN
        CREATE POLICY activity_isolation ON public."Activity"
            FOR ALL
            USING (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            )
            WITH CHECK (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            );
    END IF;
END $$;

-- Invoice table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice' AND policyname = 'invoice_isolation') THEN
        CREATE POLICY invoice_isolation ON public."Invoice"
            FOR ALL
            USING (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            )
            WITH CHECK (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            );
    END IF;
END $$;

-- Product table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product' AND policyname = 'product_isolation') THEN
        CREATE POLICY product_isolation ON public."Product"
            FOR ALL
            USING (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            )
            WITH CHECK (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            );
    END IF;
END $$;

-- Pipeline table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipeline' AND policyname = 'pipeline_isolation') THEN
        CREATE POLICY pipeline_isolation ON public."Pipeline"
            FOR ALL
            USING (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            )
            WITH CHECK (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            );
    END IF;
END $$;

-- Review table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review' AND policyname = 'review_isolation') THEN
        CREATE POLICY review_isolation ON public."Review"
            FOR ALL
            USING (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            )
            WITH CHECK (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            );
    END IF;
END $$;

-- ==============================================
-- OTHER TABLES: Generic business isolation
-- ==============================================

DO $$
DECLARE
    tables_with_business TEXT[] := ARRAY[
        'AIFollowUp', 'ApiKey', 'AutomationRule', 'AutopilotSettings',
        'BlogCategory', 'BlogPost', 'CallLog', 'CartRecovery',
        'ChatbotFlow', 'ClientPortal', 'Coupon', 'Course',
        'CustomField', 'CustomerSegment', 'DiscountRule', 'Document',
        'DripCampaign', 'ECommerceStore', 'EmailList', 'EmailTemplate',
        'Funnel', 'Goal', 'Integration', 'LeadScore', 'LedgerEntry',
        'LiveChatSession', 'LoyaltyPoints', 'MessageTemplate',
        'Notification', 'Order', 'PaymentLink', 'Post',
        'PosterTemplate', 'ReferralProgram', 'ScheduledMessage',
        'SupportTicket', 'Survey', 'TriggerLink', 'Wallet',
        'Webhook', 'WingsStore', 'Workflow', 'WorkflowExecution'
    ];
    t TEXT;
    policy_name TEXT;
BEGIN
    FOREACH t IN ARRAY tables_with_business LOOP
        policy_name := lower(replace(t, '_', '_')) || '_isolation';
        
        -- Check if table exists and has businessId column
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = t 
            AND column_name = 'businessId'
        ) THEN
            -- Check if policy already exists
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE tablename = t 
                AND schemaname = 'public'
            ) THEN
                EXECUTE format(
                    'CREATE POLICY %I ON public.%I FOR ALL USING ("businessId" = public.get_user_business_id() OR public.is_super_admin()) WITH CHECK ("businessId" = public.get_user_business_id() OR public.is_super_admin())',
                    policy_name, t
                );
                RAISE NOTICE 'Created policy on %', t;
            END IF;
        END IF;
    END LOOP;
END $$;

-- ==============================================
-- SPECIAL TABLES: Different isolation rules
-- ==============================================

-- Subscription table (business + super_admin)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription' AND policyname = 'subscription_isolation') THEN
        CREATE POLICY subscription_isolation ON public."Subscription"
            FOR ALL
            USING (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            )
            WITH CHECK (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            );
    END IF;
END $$;

-- AuditLog table (business + super_admin, read-only for users)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auditlog' AND policyname = 'auditlog_isolation') THEN
        CREATE POLICY auditlog_isolation ON public."AuditLog"
            FOR SELECT
            USING (
                "businessId" = public.get_user_business_id()
                OR public.is_super_admin()
            );
    END IF;
END $$;

-- ==============================================
-- VERIFY: Check policies created
-- ==============================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==============================================
-- SUMMARY
-- ==============================================
-- After running this script:
-- 1. service_all_policy is DROPPED from all tables
-- 2. RLS is ENABLED on all tables
-- 3. Business isolation policies are CREATED
-- 4. Each user can only access their own business data
-- 5. SUPER_ADMIN can access all data
-- ==============================================
