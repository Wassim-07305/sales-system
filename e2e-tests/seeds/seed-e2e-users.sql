-- =============================================================================
-- seed-e2e-users.sql — 20 comptes E2E test dans Supabase Auth + Profiles
-- Mot de passe pour tous : demo1234
-- Idempotent : skip les emails existants
-- Rôles couverts : admin(2), manager(2), setter(4), closer(3), client_b2b(4), client_b2c(5)
-- =============================================================================

DO $$
DECLARE
  pw_hash TEXT := crypt('demo1234', gen_salt('bf'));
  v_id UUID;

  -- 20 utilisateurs de test couvrant tous les rôles
  e2e_users TEXT[][] := ARRAY[
    -- Admins (2)
    ['Admin Test',         'admin.test@demo.com',       'admin'],
    ['Admin Backup',       'admin.backup@demo.com',     'admin'],

    -- Managers (2)
    ['Marie Leroy',        'marie.leroy@demo.com',      'manager'],
    ['Antoine Blanc',      'antoine.blanc@demo.com',    'manager'],

    -- Setters (4)
    ['Thomas Martin',      'thomas.martin@demo.com',    'setter'],
    ['Sophie Durand',      'sophie.durand@demo.com',    'setter'],
    ['Maxime Girard',      'maxime.girard@demo.com',    'setter'],
    ['Camille Fournier',   'camille.fournier@demo.com', 'setter'],

    -- Closers (3)
    ['Lucas Bernard',      'lucas.bernard@demo.com',    'closer'],
    ['Clara Dubois',       'clara.dubois@demo.com',     'closer'],
    ['Hugo Lambert',       'hugo.lambert@demo.com',     'closer'],

    -- Clients B2B (4)
    ['Jean Dupont',        'jean.dupont@demo.com',      'client_b2b'],
    ['Emma Petit',         'emma.petit@demo.com',       'client_b2b'],
    ['Nicolas Mercier',    'nicolas.mercier@demo.com',  'client_b2b'],
    ['Isabelle Roux',      'isabelle.roux@demo.com',    'client_b2b'],

    -- Clients B2C (5)
    ['Pierre Moreau',      'pierre.moreau@demo.com',    'client_b2c'],
    ['Julie Robert',       'julie.robert@demo.com',     'client_b2c'],
    ['Léa Garcia',         'lea.garcia@demo.com',       'client_b2c'],
    ['Mathis Simon',       'mathis.simon@demo.com',     'client_b2c'],
    ['Chloé Laurent',      'chloe.laurent@demo.com',    'client_b2c']
  ];
  i INT;
  v_name TEXT;
  v_email TEXT;
  v_role TEXT;
  existing_id UUID;
BEGIN

  FOR i IN 1..array_length(e2e_users, 1) LOOP
    v_name  := e2e_users[i][1];
    v_email := e2e_users[i][2];
    v_role  := e2e_users[i][3];

    -- Vérifier si l'utilisateur existe déjà
    SELECT id INTO existing_id FROM auth.users WHERE email = v_email;

    IF existing_id IS NOT NULL THEN
      -- S'assurer que le profil existe aussi
      INSERT INTO profiles (id, full_name, email, role, avatar_url, onboarding_completed, created_at)
      VALUES (existing_id, v_name, v_email, v_role, NULL, true, NOW())
      ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        onboarding_completed = true;
      RAISE NOTICE 'User % already exists (%), ensured profile', v_email, existing_id;
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

  RAISE NOTICE '✅ Seed E2E users complete — 20 users across 6 roles';

END $$;
