-- =============================================================================
-- cleanup-broken-demo-users.sql
-- Nettoie les users démo mal insérés par le script SQL direct
-- À exécuter dans Supabase SQL Editor AVANT de recréer via l'API
-- =============================================================================

-- 1. Supprimer les profiles des demo users
DELETE FROM profiles
WHERE email IN (
  'thomas.martin@demo.com',
  'sophie.durand@demo.com',
  'lucas.bernard@demo.com',
  'marie.leroy@demo.com',
  'jean.dupont@demo.com',
  'emma.petit@demo.com',
  'pierre.moreau@demo.com',
  'julie.robert@demo.com',
  'test.cleanup@demo.com'
);

-- 2. Supprimer les identities des demo users
DELETE FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'thomas.martin@demo.com',
    'sophie.durand@demo.com',
    'lucas.bernard@demo.com',
    'marie.leroy@demo.com',
    'jean.dupont@demo.com',
    'emma.petit@demo.com',
    'pierre.moreau@demo.com',
    'julie.robert@demo.com',
    'test.cleanup@demo.com'
  )
);

-- 3. Supprimer les sessions
DELETE FROM auth.sessions
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'thomas.martin@demo.com',
    'sophie.durand@demo.com',
    'lucas.bernard@demo.com',
    'marie.leroy@demo.com',
    'jean.dupont@demo.com',
    'emma.petit@demo.com',
    'pierre.moreau@demo.com',
    'julie.robert@demo.com',
    'test.cleanup@demo.com'
  )
);

-- 4. Supprimer les refresh tokens
DELETE FROM auth.refresh_tokens
WHERE session_id IN (
  SELECT id FROM auth.sessions
  WHERE user_id IN (
    SELECT id FROM auth.users
    WHERE email IN (
      'thomas.martin@demo.com',
      'sophie.durand@demo.com',
      'lucas.bernard@demo.com',
      'marie.leroy@demo.com',
      'jean.dupont@demo.com',
      'emma.petit@demo.com',
      'pierre.moreau@demo.com',
      'julie.robert@demo.com',
      'test.cleanup@demo.com'
    )
  )
);

-- 5. Supprimer les users auth
DELETE FROM auth.users
WHERE email IN (
  'thomas.martin@demo.com',
  'sophie.durand@demo.com',
  'lucas.bernard@demo.com',
  'marie.leroy@demo.com',
  'jean.dupont@demo.com',
  'emma.petit@demo.com',
  'pierre.moreau@demo.com',
  'julie.robert@demo.com',
  'test.cleanup@demo.com'
);
