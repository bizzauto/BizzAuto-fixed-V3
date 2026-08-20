SELECT id, email, name, role, length(coalesce(password,'')) as pw_len, "businessId" FROM public."User";
