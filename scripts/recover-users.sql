-- Recover Business + User records for existing auth.users
DO $$
DECLARE
  v_biz1_id text;
  v_biz2_id text;
  v_user1_id text;
  v_user2_id text;
BEGIN
  -- 1. Create Business for bizzauto.solution@gmail.com
  INSERT INTO public."Business" (id, name, type, email, phone, address, city, state, country, timezone, plan, "admissionCompleted", "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, 'BizzAuto Solutions', 'Technology', 'bizzauto.solution@gmail.com', '+919876543210', 'Main Office, Andheri East', 'Mumbai', 'Maharashtra', 'India', 'Asia/Kolkata', 'PROFESSIONAL', true, NOW(), NOW())
  RETURNING id INTO v_biz1_id;
  RAISE NOTICE 'Business 1 created: %', v_biz1_id;

  -- 2. Create User for bizzauto.solution@gmail.com
  INSERT INTO public."User" (id, email, name, role, "businessId", "isActive", "isVerified", "createdAt", "updatedAt", "image")
  VALUES (gen_random_uuid()::text, 'bizzauto.solution@gmail.com', 'BizzAuto Admin', 'OWNER', v_biz1_id, true, true, NOW(), NOW(), '')
  RETURNING id INTO v_user1_id;
  RAISE NOTICE 'User 1 created: %', v_user1_id;

  -- 3. Create Business for sandydarekaro@gmail.com
  INSERT INTO public."Business" (id, name, type, email, phone, address, city, state, country, timezone, plan, "admissionCompleted", "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, 'Sandy Enterprise', 'Technology', 'sandydarekaro@gmail.com', '+919876543211', 'Business District, Connaught Place', 'Delhi', 'Delhi', 'India', 'Asia/Kolkata', 'PROFESSIONAL', true, NOW(), NOW())
  RETURNING id INTO v_biz2_id;
  RAISE NOTICE 'Business 2 created: %', v_biz2_id;

  -- 4. Create User for sandydarekaro@gmail.com
  INSERT INTO public."User" (id, email, name, role, "businessId", "isActive", "isVerified", "createdAt", "updatedAt", "image")
  VALUES (gen_random_uuid()::text, 'sandydarekaro@gmail.com', 'Sandy User', 'ADMIN', v_biz2_id, true, true, NOW(), NOW(), '')
  RETURNING id INTO v_user2_id;
  RAISE NOTICE 'User 2 created: %', v_user2_id;
END $$;
