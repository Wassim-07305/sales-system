-- =============================================================================
-- seed-demo-users.sql — Création des 8 comptes démo dans Supabase Auth + Profiles
-- À exécuter dans Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Mot de passe pour tous : demo1234
-- Idempotent : safe to run multiple times (skips existing emails)
-- =============================================================================

DO $$
DECLARE
  pw_hash TEXT := crypt('demo1234', gen_salt('bf'));
  v_id UUID;

  -- Array of demo users: full_name, email, role
  demo_users TEXT[][] := ARRAY[
    ['Thomas Martin',  'thomas.martin@demo.com', 'setter'],
    ['Sophie Durand',  'sophie.durand@demo.com', 'setter'],
    ['Lucas Bernard',  'lucas.bernard@demo.com', 'closer'],
    ['Marie Leroy',    'marie.leroy@demo.com',   'manager'],
    ['Jean Dupont',    'jean.dupont@demo.com',    'client_b2b'],
    ['Emma Petit',     'emma.petit@demo.com',     'client_b2b'],
    ['Pierre Moreau',  'pierre.moreau@demo.com',  'client_b2c'],
    ['Julie Robert',   'julie.robert@demo.com',   'client_b2c']
  ];
  i INT;
  v_name TEXT;
  v_email TEXT;
  v_role TEXT;
  existing_id UUID;
BEGIN

  FOR i IN 1..array_length(demo_users, 1) LOOP
    v_name  := demo_users[i][1];
    v_email := demo_users[i][2];
    v_role  := demo_users[i][3];

    -- Check if user already exists in auth.users
    SELECT id INTO existing_id FROM auth.users WHERE email = v_email;

    IF existing_id IS NOT NULL THEN
      RAISE NOTICE 'User % already exists (%), skipping', v_email, existing_id;
      CONTINUE;
    END IF;

    v_id := gen_random_uuid();

    -- 1. Insert into auth.users
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      v_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      pw_hash,
      NOW(), NOW(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', v_name),
      NOW(), NOW()
    );

    -- 2. Insert into auth.identities
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_id, v_id, v_email,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      'email',
      NOW(), NOW(), NOW()
    );

    -- 3. Insert into profiles
    INSERT INTO profiles (id, full_name, email, role, avatar_url, onboarding_completed, created_at)
    VALUES (v_id, v_name, v_email, v_role, NULL, true, NOW())
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Created user: % (%) — role: %', v_name, v_email, v_role;

  END LOOP;

  RAISE NOTICE '✅ Seed demo users complete';

END $$;
