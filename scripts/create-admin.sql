DO $$
DECLARE
  v_biz_id text;
  v_user_id text;
BEGIN
  INSERT INTO public."Business" (id, name, type, email, phone, address, city, state, country, timezone, plan, "admissionCompleted", "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, 'BizzAuto AI Solutions', 'Technology', 'bizzautoai.solution@gmail.com', '+919999999999', 'Main Office', 'Mumbai', 'Maharashtra', 'India', 'Asia/Kolkata', 'PROFESSIONAL', true, NOW(), NOW())
  RETURNING id INTO v_biz_id;
  RAISE NOTICE 'Business created: %', v_biz_id;

  INSERT INTO public."User" (id, email, name, password, role, "businessId", "isActive", "isVerified", "emailVerified", "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, 'bizzautoai.solution@gmail.com', 'BizzAuto Admin', '$2b$10$VMcMm5AZBiJZ/qGAD4GlRuRX9sdgegk2Ycg2aoWTvQazDc/MIW6ZO', 'OWNER', v_biz_id, true, true, NOW(), NOW(), NOW())
  RETURNING id INTO v_user_id;
  RAISE NOTICE 'User created: %', v_user_id;
END $$;
