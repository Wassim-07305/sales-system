-- =============================================================================
-- seed-demo-complet.sql — Données de démonstration complètes pour Sales System
-- À exécuter dans Supabase SQL Editor (bypass RLS)
-- Admin user: 606bfbee-ceb7-4f81-bc1d-675732cd3f0f (Damien Reynaud)
-- =============================================================================

DO $$
DECLARE
  admin_id UUID := '606bfbee-ceb7-4f81-bc1d-675732cd3f0f';
  -- Channel IDs
  ch_general UUID := gen_random_uuid();
  ch_annonces UUID := gen_random_uuid();
  ch_wins UUID := gen_random_uuid();
  ch_technique UUID := gen_random_uuid();
  ch_closing UUID := gen_random_uuid();
  -- Course IDs
  course_prospection UUID := gen_random_uuid();
  course_closing UUID := gen_random_uuid();
  course_mindset UUID := gen_random_uuid();
  -- Lesson IDs
  lesson_1 UUID := gen_random_uuid();
  lesson_2 UUID := gen_random_uuid();
  lesson_3 UUID := gen_random_uuid();
  lesson_4 UUID := gen_random_uuid();
  lesson_5 UUID := gen_random_uuid();
  lesson_6 UUID := gen_random_uuid();
  -- Prospect list IDs
  list_linkedin UUID := gen_random_uuid();
  list_instagram UUID := gen_random_uuid();
  list_salon UUID := gen_random_uuid();
  -- Prospect IDs (for follow-ups & conversations)
  prospect_1 UUID := gen_random_uuid();
  prospect_2 UUID := gen_random_uuid();
  prospect_3 UUID := gen_random_uuid();
  prospect_4 UUID := gen_random_uuid();
  prospect_5 UUID := gen_random_uuid();
  prospect_6 UUID := gen_random_uuid();
  prospect_7 UUID := gen_random_uuid();
  prospect_8 UUID := gen_random_uuid();
  prospect_9 UUID := gen_random_uuid();
  prospect_10 UUID := gen_random_uuid();
  prospect_11 UUID := gen_random_uuid();
  prospect_12 UUID := gen_random_uuid();
  -- Contract IDs
  contract_1 UUID := gen_random_uuid();
  contract_2 UUID := gen_random_uuid();
  contract_3 UUID := gen_random_uuid();
  -- Follow-up sequence IDs
  seq_linkedin UUID := gen_random_uuid();
  seq_instagram UUID := gen_random_uuid();
  -- Group call IDs
  call_1 UUID := gen_random_uuid();
  call_2 UUID := gen_random_uuid();
  call_3 UUID := gen_random_uuid();
  -- WhatsApp sequence IDs
  wa_seq_1 UUID := gen_random_uuid();
  wa_seq_2 UUID := gen_random_uuid();
  -- Flowchart IDs
  flow_1 UUID := gen_random_uuid();
  flow_2 UUID := gen_random_uuid();
  -- Community post IDs for comments
  post_1 UUID := gen_random_uuid();
  post_2 UUID := gen_random_uuid();
  post_3 UUID := gen_random_uuid();
  post_4 UUID := gen_random_uuid();
  post_5 UUID := gen_random_uuid();
BEGIN

-- =========================================================================
-- 1. CHANNELS (Chat)
-- =========================================================================
INSERT INTO channels (id, name, type, description, created_by, created_at) VALUES
  (ch_general, 'Général', 'group', 'Discussion libre — partagez vos questions et idées', admin_id, NOW() - INTERVAL '60 days'),
  (ch_annonces, 'Annonces', 'announcement', 'Annonces officielles de l''équipe Sales System', admin_id, NOW() - INTERVAL '60 days'),
  (ch_wins, 'Wins & Victoires', 'group', 'Partagez vos réussites et célébrez ensemble !', admin_id, NOW() - INTERVAL '55 days'),
  (ch_technique, 'Technique de vente', 'group', 'Échanges sur les techniques de prospection et closing', admin_id, NOW() - INTERVAL '50 days'),
  (ch_closing, 'Closing avancé', 'group', 'Stratégies avancées de closing pour les expérimentés', admin_id, NOW() - INTERVAL '45 days')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 2. MESSAGES (Chat) — Conversations réalistes
-- =========================================================================
INSERT INTO messages (id, channel_id, sender_id, content, message_type, created_at) VALUES
  -- Général
  (gen_random_uuid(), ch_general, admin_id, 'Bienvenue dans le channel général ! N''hésitez pas à poser vos questions ici.', 'text', NOW() - INTERVAL '58 days'),
  (gen_random_uuid(), ch_general, admin_id, 'Rappel : le call de groupe hebdomadaire est tous les mardis à 14h. Lien dans #annonces.', 'text', NOW() - INTERVAL '40 days'),
  (gen_random_uuid(), ch_general, admin_id, 'Qui a testé la nouvelle technique de relance par vocal ? J''ai eu 3 réponses en 1h !', 'text', NOW() - INTERVAL '20 days'),
  (gen_random_uuid(), ch_general, admin_id, 'Astuce rapide : quand un prospect dit "envoyez-moi un email", posez-lui une question ouverte avant. Ça relance 80% des conversations.', 'text', NOW() - INTERVAL '10 days'),
  (gen_random_uuid(), ch_general, admin_id, 'Pensez à remplir votre journal quotidien, c''est la clé de la progression !', 'text', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), ch_general, admin_id, 'Nouvelle ressource disponible dans la bibliothèque : Guide des objections prix. À lire absolument.', 'text', NOW() - INTERVAL '2 days'),

  -- Annonces
  (gen_random_uuid(), ch_annonces, admin_id, '📢 Nouvelle fonctionnalité : le module de Roleplay IA est disponible ! Entraînez-vous à closer avec des profils de prospects virtuels.', 'text', NOW() - INTERVAL '30 days'),
  (gen_random_uuid(), ch_annonces, admin_id, '📢 Mise à jour de la formation : 3 nouvelles leçons sur le closing en B2B ont été ajoutées dans l''Academy.', 'text', NOW() - INTERVAL '15 days'),
  (gen_random_uuid(), ch_annonces, admin_id, '📢 Challenge de la semaine lancé ! Marathon de la prospection — objectif : 50 messages qualifiés. Rendez-vous dans Challenges.', 'text', NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), ch_annonces, admin_id, '📢 Prochain masterclass en live : "Les 5 erreurs fatales en closing" — Jeudi 14h. Inscrivez-vous dans Calls.', 'text', NOW() - INTERVAL '3 days'),

  -- Wins
  (gen_random_uuid(), ch_wins, admin_id, '🎉 Premier deal closé cette semaine : 4 500 € ! La méthode SPIN fonctionne à merveille.', 'text', NOW() - INTERVAL '25 days'),
  (gen_random_uuid(), ch_wins, admin_id, '💪 3 appels découverte bookés aujourd''hui via LinkedIn. La prospection ciblée, ça paie !', 'text', NOW() - INTERVAL '12 days'),
  (gen_random_uuid(), ch_wins, admin_id, '🔥 Meilleur mois depuis le lancement : 12 800 € de CA signé en mars. Merci Sales System !', 'text', NOW() - INTERVAL '4 days'),

  -- Technique de vente
  (gen_random_uuid(), ch_technique, admin_id, 'Technique du jour : la "boucle de reformulation". Après chaque réponse du prospect, reformulez en commençant par "Si je comprends bien..."', 'text', NOW() - INTERVAL '28 days'),
  (gen_random_uuid(), ch_technique, admin_id, 'Question fréquente : quand est-ce qu''on propose le prix ? Réponse : jamais avant d''avoir fait émerger la douleur ET la solution idéale dans l''esprit du prospect.', 'text', NOW() - INTERVAL '18 days'),
  (gen_random_uuid(), ch_technique, admin_id, 'Framework BANT adapté au marché français : Budget → Autorité → Nécessité → Timing. L''erreur classique : demander le budget trop tôt.', 'text', NOW() - INTERVAL '8 days'),

  -- Closing avancé
  (gen_random_uuid(), ch_closing, admin_id, 'La technique du "silence stratégique" : après avoir annoncé le prix, ne parlez plus. Les 5 secondes de silence sont les plus puissantes en vente.', 'text', NOW() - INTERVAL '22 days'),
  (gen_random_uuid(), ch_closing, admin_id, 'Objection "c''est trop cher" → Réponse : "Trop cher par rapport à quoi exactement ?" — Laissez le prospect se comparer lui-même.', 'text', NOW() - INTERVAL '14 days'),
  (gen_random_uuid(), ch_closing, admin_id, 'Pattern interrupt en closing : "Avant de vous donner le tarif, laissez-moi vous poser une question importante : si le prix était exactement dans votre budget, est-ce qu''on avancerait ?"', 'text', NOW() - INTERVAL '6 days');

-- =========================================================================
-- 3. BOOKINGS — RDV avec statuts variés
-- =========================================================================
INSERT INTO bookings (id, prospect_name, prospect_email, prospect_phone, assigned_to, slot_type, scheduled_at, duration_minutes, status, notes, created_at) VALUES
  -- Semaine passée
  (gen_random_uuid(), 'Claire Dubois', 'claire.dubois@techvision.fr', '+33 6 12 34 56 78', admin_id, 'decouverte', NOW() - INTERVAL '6 days' + TIME '09:00', 30, 'completed', 'Très intéressée par l''accompagnement. A demandé une proposition.', NOW() - INTERVAL '10 days'),
  (gen_random_uuid(), 'Pierre Moreau', 'p.moreau@moreau-distribution.fr', '+33 6 23 45 67 89', admin_id, 'closing', NOW() - INTERVAL '5 days' + TIME '14:00', 45, 'completed', 'Deal closé ! Contrat Standard signé — 4 500 €.', NOW() - INTERVAL '8 days'),
  (gen_random_uuid(), 'Émilie Rousseau', 'emilie.rousseau@coaching.io', '+33 6 34 56 78 90', admin_id, 'decouverte', NOW() - INTERVAL '4 days' + TIME '10:30', 30, 'no_show', 'No-show. Relancer par LinkedIn.', NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), 'Karim Benali', 'k.benali@digitalfactory.fr', '+33 6 45 67 89 01', admin_id, 'suivi', NOW() - INTERVAL '3 days' + TIME '11:00', 30, 'completed', 'Suivi post-onboarding. Client satisfait, potentiel upsell.', NOW() - INTERVAL '6 days'),
  (gen_random_uuid(), 'Nadia Kermiche', 'nadia@kermiche-immo.fr', '+33 6 56 78 90 12', admin_id, 'closing', NOW() - INTERVAL '2 days' + TIME '15:30', 45, 'cancelled', 'Annulé — la cliente reporte à la semaine prochaine.', NOW() - INTERVAL '5 days'),

  -- Semaine en cours
  (gen_random_uuid(), 'Sophie Martin', 'sophie.martin@esn-digital.fr', '+33 6 67 89 01 23', admin_id, 'decouverte', NOW() + TIME '09:30', 30, 'confirmed', 'Directrice commerciale — 15 commerciaux. Lead chaud.', NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), 'Thomas Girard', 'thomas@agenceweb-lyon.fr', '+33 6 78 90 12 34', admin_id, 'decouverte', NOW() + INTERVAL '1 day' + TIME '10:00', 30, 'confirmed', 'Gérant agence web. Intéressé par le pack prospection.', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'Marie Lefèvre', 'marie.lefevre@pme-industrie.fr', '+33 6 89 01 23 45', admin_id, 'closing', NOW() + INTERVAL '1 day' + TIME '14:30', 45, 'confirmed', 'DRH — closing sur la formation équipe commerciale.', NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'Jean-Pierre Durand', 'jp.durand@plombier-chauffage.fr', '+33 6 90 12 34 56', admin_id, 'decouverte', NOW() + INTERVAL '2 days' + TIME '11:00', 30, 'confirmed', 'Artisan, rencontré au salon. Premier contact digital.', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'Amina Benali', 'amina@cosmetiques-bio.fr', '+33 6 01 23 45 67', admin_id, 'closing', NOW() + INTERVAL '3 days' + TIME '16:00', 45, 'confirmed', 'E-commerce cosmétiques — closing pack Premium.', NOW() - INTERVAL '2 days'),

  -- Semaine prochaine
  (gen_random_uuid(), 'Lucas Martin', 'lucas.martin@startup-ia.fr', '+33 6 11 22 33 44', admin_id, 'decouverte', NOW() + INTERVAL '7 days' + TIME '09:00', 30, 'confirmed', 'CEO startup IA — lead entrant via le site.', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'Chloé Bernard', 'chloe@bernard-conseil.fr', '+33 6 22 33 44 55', admin_id, 'suivi', NOW() + INTERVAL '8 days' + TIME '14:00', 30, 'confirmed', 'Suivi mensuel — cliente depuis 2 mois.', NOW()),
  (gen_random_uuid(), 'Nicolas Petit', 'nicolas@petit-formation.fr', '+33 6 33 44 55 66', admin_id, 'demo', NOW() + INTERVAL '9 days' + TIME '10:30', 45, 'confirmed', 'Démo de la plateforme — prospect qualifié par setter.', NOW());

-- =========================================================================
-- 4. BOOKING SLOTS (créneaux disponibles)
-- =========================================================================
INSERT INTO booking_slots (id, user_id, day_of_week, start_time, end_time, duration_minutes, slot_type, is_active) VALUES
  (gen_random_uuid(), admin_id, 1, '09:00', '12:00', 30, 'decouverte', true),
  (gen_random_uuid(), admin_id, 1, '14:00', '17:00', 45, 'closing', true),
  (gen_random_uuid(), admin_id, 2, '09:00', '12:00', 30, 'decouverte', true),
  (gen_random_uuid(), admin_id, 2, '14:00', '17:00', 45, 'closing', true),
  (gen_random_uuid(), admin_id, 3, '10:00', '12:00', 30, 'suivi', true),
  (gen_random_uuid(), admin_id, 3, '14:00', '16:00', 45, 'demo', true),
  (gen_random_uuid(), admin_id, 4, '09:00', '12:00', 30, 'decouverte', true),
  (gen_random_uuid(), admin_id, 4, '14:00', '17:00', 45, 'closing', true),
  (gen_random_uuid(), admin_id, 5, '09:00', '11:00', 30, 'suivi', true)
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 5. CONTRACTS + INSTALLMENTS + INVOICES
-- =========================================================================
INSERT INTO contracts (id, client_id, amount, payment_schedule, status, content, installment_count, created_at, signed_at) VALUES
  (contract_1, admin_id, 4500, '3 mensualités de 1 500 €', 'signed',
   'Contrat d''accompagnement Sales System Standard — Claire Dubois / TechVision', 3,
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days'),
  (contract_2, admin_id, 8900, '4 mensualités de 2 225 €', 'signed',
   'Contrat d''accompagnement Sales System Premium — Karim Benali / Digital Factory', 4,
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '43 days'),
  (contract_3, admin_id, 2500, 'Paiement unique', 'sent',
   'Audit tunnel de vente — Nadia Kermiche / Kermiche Immobilier', 1,
   NOW() - INTERVAL '10 days', NULL)
ON CONFLICT DO NOTHING;

-- Installments pour contrat 1 (3x 1500€)
INSERT INTO payment_installments (id, contract_id, amount, due_date, status, paid_at, created_at) VALUES
  (gen_random_uuid(), contract_1, 1500, (NOW() - INTERVAL '28 days')::DATE, 'paid', NOW() - INTERVAL '28 days', NOW() - INTERVAL '30 days'),
  (gen_random_uuid(), contract_1, 1500, (NOW() + INTERVAL '2 days')::DATE, 'pending', NULL, NOW() - INTERVAL '30 days'),
  (gen_random_uuid(), contract_1, 1500, (NOW() + INTERVAL '32 days')::DATE, 'pending', NULL, NOW() - INTERVAL '30 days')
ON CONFLICT DO NOTHING;

-- Installments pour contrat 2 (4x 2225€)
INSERT INTO payment_installments (id, contract_id, amount, due_date, status, paid_at, created_at) VALUES
  (gen_random_uuid(), contract_2, 2225, (NOW() - INTERVAL '43 days')::DATE, 'paid', NOW() - INTERVAL '43 days', NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), contract_2, 2225, (NOW() - INTERVAL '13 days')::DATE, 'paid', NOW() - INTERVAL '12 days', NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), contract_2, 2225, (NOW() + INTERVAL '17 days')::DATE, 'pending', NULL, NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), contract_2, 2225, (NOW() + INTERVAL '47 days')::DATE, 'pending', NULL, NOW() - INTERVAL '45 days')
ON CONFLICT DO NOTHING;

-- Invoices
INSERT INTO invoices (id, contract_id, client_id, amount, invoice_number, status, due_date, paid_at, created_at) VALUES
  (gen_random_uuid(), contract_1, admin_id, 1500, 'INV-2026-001', 'paid', (NOW() - INTERVAL '28 days')::DATE, NOW() - INTERVAL '28 days', NOW() - INTERVAL '30 days'),
  (gen_random_uuid(), contract_1, admin_id, 1500, 'INV-2026-002', 'sent', (NOW() + INTERVAL '2 days')::DATE, NULL, NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), contract_2, admin_id, 2225, 'INV-2026-003', 'paid', (NOW() - INTERVAL '43 days')::DATE, NOW() - INTERVAL '43 days', NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), contract_2, admin_id, 2225, 'INV-2026-004', 'paid', (NOW() - INTERVAL '13 days')::DATE, NOW() - INTERVAL '12 days', NOW() - INTERVAL '15 days'),
  (gen_random_uuid(), contract_2, admin_id, 2225, 'INV-2026-005', 'sent', (NOW() + INTERVAL '17 days')::DATE, NULL, NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), contract_3, admin_id, 2500, 'INV-2026-006', 'draft', (NOW() + INTERVAL '15 days')::DATE, NULL, NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 6. COURSES + LESSONS (Academy)
-- =========================================================================
INSERT INTO courses (id, title, description, position, is_published, target_roles, created_at) VALUES
  (course_prospection, 'Maîtriser la prospection digitale',
   'Formation complète pour générer des leads qualifiés sur LinkedIn et Instagram. De la stratégie au premier message, en passant par l''optimisation du profil.',
   1, true, ARRAY['setter', 'closer'], NOW() - INTERVAL '60 days'),
  (course_closing, 'L''art du closing en B2B',
   'Techniques avancées de closing adaptées au marché francophone. Gestion des objections, négociation, et signature du contrat.',
   2, true, ARRAY['closer'], NOW() - INTERVAL '50 days'),
  (course_mindset, 'Mindset commercial gagnant',
   'Développez l''état d''esprit d''un top performer : gestion du rejet, motivation intrinsèque, routines quotidiennes et objectifs SMART.',
   3, true, ARRAY['setter', 'closer'], NOW() - INTERVAL '40 days')
ON CONFLICT DO NOTHING;

INSERT INTO lessons (id, course_id, title, description, position, duration_minutes, content_html, created_at) VALUES
  -- Cours Prospection
  (lesson_1, course_prospection, 'Optimiser son profil LinkedIn',
   'Les 7 éléments clés d''un profil LinkedIn qui convertit : photo, bannière, titre, résumé, expérience, recommandations, contenu.',
   1, 18, '<h2>Les 7 piliers d''un profil qui convertit</h2><p>Votre profil LinkedIn est votre vitrine commerciale. Chaque élément doit être optimisé pour attirer votre client idéal...</p>', NOW() - INTERVAL '58 days'),
  (lesson_2, course_prospection, 'Identifier ses prospects idéaux',
   'Méthode pour définir votre ICP (Ideal Customer Profile) et utiliser les filtres LinkedIn Sales Navigator.',
   2, 22, '<h2>Définir votre ICP</h2><p>L''erreur n°1 en prospection : cibler trop large. Voici comment définir précisément votre client idéal...</p>', NOW() - INTERVAL '55 days'),
  (lesson_3, course_prospection, 'Rédiger des messages d''accroche irrésistibles',
   'Framework en 4 étapes pour rédiger des messages de prospection qui obtiennent des réponses. Templates A/B testés.',
   3, 25, '<h2>Le framework AIDA adapté à la prospection</h2><p>Attention → Intérêt → Désir → Action. Voici comment l''appliquer à chaque message...</p>', NOW() - INTERVAL '52 days'),

  -- Cours Closing
  (lesson_4, course_closing, 'L''appel découverte parfait',
   'Structure d''un appel découverte en 5 phases : introduction, contexte, douleur, projection, next step.',
   1, 30, '<h2>Les 5 phases de l''appel découverte</h2><p>Un appel découverte réussi suit toujours la même structure. Voici le framework utilisé par les top closers...</p>', NOW() - INTERVAL '48 days'),
  (lesson_5, course_closing, 'Gérer les objections comme un pro',
   'Les 12 objections les plus courantes et les réponses qui fonctionnent. Technique du "feel-felt-found".',
   2, 35, '<h2>Le guide ultime des objections</h2><p>Une objection n''est pas un refus, c''est une demande d''information. Voici comment transformer chaque objection en opportunité...</p>', NOW() - INTERVAL '45 days'),

  -- Cours Mindset
  (lesson_6, course_mindset, 'Les routines des top performers',
   'Structurez votre journée pour performer : morning routine, blocs de prospection, débriefing, journaling.',
   1, 20, '<h2>La journée type d''un closer d''élite</h2><p>Les meilleurs commerciaux ne comptent pas sur la motivation. Ils comptent sur des systèmes et des routines...</p>', NOW() - INTERVAL '38 days')
ON CONFLICT DO NOTHING;

-- Lesson progress pour l'admin (quelques leçons complétées)
INSERT INTO lesson_progress (id, user_id, lesson_id, completed, quiz_score, completed_at) VALUES
  (gen_random_uuid(), admin_id, lesson_1, true, 90, NOW() - INTERVAL '50 days'),
  (gen_random_uuid(), admin_id, lesson_2, true, 85, NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), admin_id, lesson_3, true, 95, NOW() - INTERVAL '40 days'),
  (gen_random_uuid(), admin_id, lesson_4, true, 88, NOW() - INTERVAL '35 days'),
  (gen_random_uuid(), admin_id, lesson_5, false, NULL, NULL)
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 7. PROSPECT LISTS + PROSPECTS
-- =========================================================================
INSERT INTO prospect_lists (id, name, source, created_by, created_at) VALUES
  (list_linkedin, 'Leads LinkedIn — Mars 2026', 'linkedin', admin_id, NOW() - INTERVAL '30 days'),
  (list_instagram, 'Leads Instagram — Coaching', 'instagram', admin_id, NOW() - INTERVAL '25 days'),
  (list_salon, 'Salon Entrepreneurs Paris 2026', 'salon', admin_id, NOW() - INTERVAL '20 days')
ON CONFLICT DO NOTHING;

INSERT INTO prospects (id, list_id, name, profile_url, platform, status, notes, engagement_score, assigned_setter_id, created_at) VALUES
  -- LinkedIn
  (prospect_1, list_linkedin, 'Claire Dubois', 'https://linkedin.com/in/claire-dubois', 'linkedin', 'booked', 'DRH TechVision — très intéressée', 85, admin_id, NOW() - INTERVAL '28 days'),
  (prospect_2, list_linkedin, 'Thomas Girard', 'https://linkedin.com/in/thomas-girard', 'linkedin', 'replied', 'Gérant agence web Lyon — a demandé plus d''infos', 70, admin_id, NOW() - INTERVAL '25 days'),
  (prospect_3, list_linkedin, 'Sophie Martin', 'https://linkedin.com/in/sophie-martin-esn', 'linkedin', 'contacted', 'Dir. commerciale ESN — message envoyé', 45, admin_id, NOW() - INTERVAL '22 days'),
  (prospect_4, list_linkedin, 'Marc Lefebvre', 'https://linkedin.com/in/marc-lefebvre-cto', 'linkedin', 'new', 'CTO SaaS — profil identifié, pas encore contacté', 30, admin_id, NOW() - INTERVAL '18 days'),
  (prospect_5, list_linkedin, 'Julie Morel', 'https://linkedin.com/in/julie-morel-coo', 'linkedin', 'not_interested', 'COO — pas le bon timing, recontacter en Q3', 20, admin_id, NOW() - INTERVAL '15 days'),

  -- Instagram
  (prospect_6, list_instagram, 'Amina Benali', 'https://instagram.com/amina_cosmetiques', 'instagram', 'booked', 'Fondatrice cosmétiques bio — très motivée', 90, admin_id, NOW() - INTERVAL '20 days'),
  (prospect_7, list_instagram, 'Lucas Martin', 'https://instagram.com/lucas.startup', 'instagram', 'replied', 'CEO startup IA — a vu la story et répondu', 75, admin_id, NOW() - INTERVAL '18 days'),
  (prospect_8, list_instagram, 'Chloé Bernard', 'https://instagram.com/chloe.conseil', 'instagram', 'contacted', 'Consultante RH — DM envoyé', 50, admin_id, NOW() - INTERVAL '15 days'),
  (prospect_9, list_instagram, 'Romain Petit', 'https://instagram.com/romain.ecom', 'instagram', 'new', 'E-commerçant mode — liké 3 posts', 35, admin_id, NOW() - INTERVAL '12 days'),

  -- Salon
  (prospect_10, list_salon, 'Pierre Moreau', 'https://linkedin.com/in/pierre-moreau-distribution', 'linkedin', 'booked', 'DAF Moreau Distribution — rencontré au salon', 88, admin_id, NOW() - INTERVAL '18 days'),
  (prospect_11, list_salon, 'Jean-Pierre Durand', NULL, 'linkedin', 'contacted', 'Artisan chauffagiste — carte de visite échangée', 40, admin_id, NOW() - INTERVAL '16 days'),
  (prospect_12, list_salon, 'Nadia Kermiche', 'https://linkedin.com/in/nadia-kermiche-immo', 'linkedin', 'replied', 'Agent immobilier — intéressée par l''audit tunnel', 72, admin_id, NOW() - INTERVAL '14 days')
ON CONFLICT DO NOTHING;

-- Prospect scores
INSERT INTO prospect_scores (id, prospect_id, engagement_score, responsiveness_score, qualification_score, total_score, temperature, computed_at) VALUES
  (gen_random_uuid(), prospect_1, 90, 85, 80, 85, 'hot', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), prospect_2, 70, 65, 60, 65, 'warm', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), prospect_3, 45, 30, 50, 42, 'cold', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), prospect_6, 95, 90, 85, 90, 'hot', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), prospect_7, 75, 70, 65, 70, 'warm', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), prospect_10, 88, 82, 78, 83, 'hot', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), prospect_12, 72, 68, 60, 67, 'warm', NOW() - INTERVAL '5 days')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 8. FOLLOW-UP SEQUENCES
-- =========================================================================
INSERT INTO follow_up_sequences (id, name, description, steps, trigger_type, is_active, created_by, created_at) VALUES
  (seq_linkedin, 'Séquence LinkedIn B2B — 5 étapes',
   'Séquence de prospection LinkedIn en 5 messages sur 14 jours. Testée sur 200+ prospects avec un taux de réponse de 32%.',
   '[{"delay_hours": 0, "message_template": "Accroche personnalisée", "channel": "linkedin"},
     {"delay_hours": 48, "message_template": "Follow-up valeur ajoutée", "channel": "linkedin"},
     {"delay_hours": 120, "message_template": "Étude de cas + social proof", "channel": "linkedin"},
     {"delay_hours": 240, "message_template": "Question directe", "channel": "linkedin"},
     {"delay_hours": 336, "message_template": "Break-up message", "channel": "linkedin"}]'::jsonb,
   'manual', true, admin_id, NOW() - INTERVAL '30 days'),
  (seq_instagram, 'Séquence Instagram — Coaching',
   'Séquence d''engagement Instagram pour niche coaching/consulting. 4 étapes + relance story.',
   '[{"delay_hours": 0, "message_template": "DM personnalisé après interaction story", "channel": "instagram"},
     {"delay_hours": 24, "message_template": "Contenu valeur gratuit (PDF/vidéo)", "channel": "instagram"},
     {"delay_hours": 72, "message_template": "Proposition d''appel découverte", "channel": "instagram"},
     {"delay_hours": 168, "message_template": "Dernier message + CTA", "channel": "instagram"}]'::jsonb,
   'auto', true, admin_id, NOW() - INTERVAL '20 days')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 9. GAMIFICATION PROFILES
-- =========================================================================
INSERT INTO gamification_profiles (id, user_id, level, level_name, total_points, current_streak, badges, updated_at) VALUES
  (gen_random_uuid(), admin_id, 3, 'Senior', 2150, 12,
   '[{"id": "first_deal", "name": "Premier deal closé", "icon": "trophy", "earned_at": "2026-01-15"},
     {"id": "streak_7", "name": "7 jours consécutifs", "icon": "flame", "earned_at": "2026-02-01"},
     {"id": "prospection_50", "name": "50 prospects contactés", "icon": "target", "earned_at": "2026-02-15"},
     {"id": "revenue_5k", "name": "5 000 € de CA signé", "icon": "coins", "earned_at": "2026-02-28"},
     {"id": "roleplay_master", "name": "10 sessions de roleplay", "icon": "brain", "earned_at": "2026-03-05"}]'::jsonb,
   NOW() - INTERVAL '1 day')
ON CONFLICT (user_id) DO UPDATE SET
  level = 3, level_name = 'Senior', total_points = 2150, current_streak = 12,
  badges = EXCLUDED.badges, updated_at = NOW();

-- =========================================================================
-- 10. DAILY QUOTAS (30 derniers jours)
-- =========================================================================
INSERT INTO daily_quotas (id, user_id, date, dms_sent, dms_target, replies_received, bookings_from_dms)
SELECT
  gen_random_uuid(), admin_id,
  (CURRENT_DATE - (d || ' days')::INTERVAL)::DATE,
  CASE WHEN EXTRACT(DOW FROM CURRENT_DATE - (d || ' days')::INTERVAL) IN (0, 6) THEN 0
       ELSE 8 + floor(random() * 15)::INT END,
  20,
  CASE WHEN EXTRACT(DOW FROM CURRENT_DATE - (d || ' days')::INTERVAL) IN (0, 6) THEN 0
       ELSE 2 + floor(random() * 5)::INT END,
  CASE WHEN EXTRACT(DOW FROM CURRENT_DATE - (d || ' days')::INTERVAL) IN (0, 6) THEN 0
       ELSE floor(random() * 3)::INT END
FROM generate_series(1, 30) AS d
ON CONFLICT (user_id, date) DO NOTHING;

-- =========================================================================
-- 11. GROUP CALLS (Replays & Sessions planifiées)
-- =========================================================================
INSERT INTO group_calls (id, title, description, scheduled_at, duration_minutes, meeting_link, replay_url, tags, created_at) VALUES
  (call_1, 'Masterclass : Les 5 erreurs fatales en closing',
   'Découvrez les erreurs qui coûtent le plus cher en closing et comment les éviter. Avec des exemples de vrais appels décryptés.',
   NOW() - INTERVAL '14 days' + TIME '14:00', 75,
   'https://meet.sales-system.app/masterclass-closing',
   'https://storage.sales-system.app/replays/masterclass-closing-erreurs.mp4',
   ARRAY['closing', 'erreurs', 'masterclass'],
   NOW() - INTERVAL '20 days'),

  (call_2, 'Call de groupe : Prospection LinkedIn avancée',
   'Session interactive sur les techniques avancées de prospection LinkedIn. Audit de profils en direct.',
   NOW() - INTERVAL '7 days' + TIME '14:00', 60,
   'https://meet.sales-system.app/call-prospection',
   'https://storage.sales-system.app/replays/call-prospection-linkedin.mp4',
   ARRAY['prospection', 'linkedin', 'profil'],
   NOW() - INTERVAL '14 days'),

  (call_3, 'Prochain call : Stratégie de pricing et négociation',
   'Comment structurer son offre et défendre son prix face aux objections. Techniques de négociation avancées.',
   NOW() + INTERVAL '4 days' + TIME '14:00', 60,
   'https://meet.sales-system.app/call-pricing',
   NULL,
   ARRAY['pricing', 'négociation', 'objections'],
   NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Attendance
INSERT INTO group_call_attendance (id, call_id, user_id, status) VALUES
  (gen_random_uuid(), call_1, admin_id, 'attended'),
  (gen_random_uuid(), call_2, admin_id, 'attended'),
  (gen_random_uuid(), call_3, admin_id, 'registered')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 12. NOTIFICATIONS
-- =========================================================================
INSERT INTO notifications (id, user_id, title, body, type, link, read, created_at) VALUES
  (gen_random_uuid(), admin_id, 'Nouveau RDV confirmé', 'Sophie Martin a confirmé son rendez-vous découverte pour demain à 9h30.', 'booking', '/bookings', false, NOW() - INTERVAL '3 hours'),
  (gen_random_uuid(), admin_id, 'Paiement reçu', 'Karim Benali a réglé sa 2ème mensualité de 2 225 €.', 'payment', '/contracts/payments', false, NOW() - INTERVAL '12 hours'),
  (gen_random_uuid(), admin_id, 'Challenge terminé !', 'Félicitations ! Vous avez complété le challenge "Marathon de la prospection" et gagné 500 points.', 'gamification', '/challenges', false, NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), admin_id, 'Nouveau message', 'Amina Benali a répondu à votre DM sur Instagram.', 'message', '/prospecting', true, NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), admin_id, 'Rappel : call de groupe', 'N''oubliez pas le call de groupe demain à 14h : "Stratégie de pricing et négociation".', 'reminder', '/chat/video', false, NOW() - INTERVAL '6 hours'),
  (gen_random_uuid(), admin_id, 'Deal avancé', 'Le deal "Pack prospection LinkedIn — Émilie Rousseau" est passé en phase Closing.', 'deal', '/crm', true, NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), admin_id, 'Nouvelle leçon disponible', 'La leçon "Négocier avec assurance" a été ajoutée au cours "L''art du closing en B2B".', 'academy', '/academy', true, NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), admin_id, 'Streak de 12 jours !', 'Bravo ! Vous êtes connecté depuis 12 jours consécutifs. Continuez comme ça !', 'gamification', '/challenges', true, NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), admin_id, 'Contrat en attente', 'Le contrat pour Nadia Kermiche est en attente de signature depuis 10 jours.', 'contract', '/contracts', false, NOW() - INTERVAL '2 hours'),
  (gen_random_uuid(), admin_id, 'Prospect chaud !', 'Lucas Martin (score 75) a répondu positivement à votre message Instagram.', 'prospect', '/prospecting', false, NOW() - INTERVAL '8 hours')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 13. COMMUNITY POSTS + COMMENTS
-- =========================================================================
INSERT INTO community_posts (id, author_id, type, title, content, likes_count, is_pinned, created_at) VALUES
  (post_1, admin_id, 'win',
   'Premier mois à 10k€ de CA !',
   'Je viens de boucler mon premier mois à 5 chiffres grâce aux méthodes Sales System. 3 deals closés cette semaine : un à 4 500€, un à 3 200€ et un à 2 800€. La clé ? La prospection systématique sur LinkedIn + le script de closing qu''on a travaillé en coaching. Merci à toute la communauté pour le soutien !',
   42, true, NOW() - INTERVAL '8 days'),

  (post_2, admin_id, 'discussion',
   'Vos meilleures techniques pour gérer le "je dois réfléchir"',
   'C''est l''objection que j''entends le plus souvent en closing. Je teste plusieurs approches : 1) "Bien sûr, réfléchir à quoi exactement ?" 2) "Je comprends, qu''est-ce qui vous ferait dire oui aujourd''hui ?" 3) Le silence stratégique. Quelle est votre technique préférée ? Partagez vos retours d''expérience !',
   28, false, NOW() - INTERVAL '5 days'),

  (post_3, admin_id, 'question',
   'Comment gérer un prospect qui ghost après la démo ?',
   'J''ai fait 3 démos cette semaine, les 3 prospects semblaient emballés, mais impossible de les recontacter. Quelqu''un a un framework de relance post-démo qui fonctionne ? J''ai testé email + LinkedIn mais rien ne passe.',
   35, false, NOW() - INTERVAL '3 days'),

  (post_4, admin_id, 'win',
   'De 0 à 50 prospects qualifiés en 2 semaines',
   'En appliquant la méthode de prospection LinkedIn du cours, j''ai réussi à identifier et contacter 50 prospects qualifiés en 2 semaines. Taux de réponse : 28%. 7 appels découverte bookés. Le secret : la personnalisation de chaque message (pas de copier-coller !). Qui veut que je partage mon process détaillé ?',
   56, false, NOW() - INTERVAL '2 days'),

  (post_5, admin_id, 'discussion',
   'Votre stack d''outils de prospection ?',
   'Curieux de connaître les outils que vous utilisez au quotidien pour prospecter. Perso : Sales System (évidemment), LinkedIn Sales Navigator, Lemlist pour les emails, Notion pour mes notes. Quels sont vos indispensables ?',
   19, false, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Comments on posts
INSERT INTO community_comments (id, post_id, author_id, content, created_at) VALUES
  (gen_random_uuid(), post_1, admin_id, 'Bravo ! C''est inspirant. Tu as combien d''appels par semaine en moyenne pour atteindre ces résultats ?', NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), post_1, admin_id, 'Incroyable progression ! Le script de closing a vraiment fait la différence pour moi aussi.', NOW() - INTERVAL '6 days'),
  (gen_random_uuid(), post_2, admin_id, 'Ma technique préférée : "Qu''est-ce qui se passerait si vous ne preniez aucune décision ?". Ça force le prospect à visualiser le coût de l''inaction.', NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), post_2, admin_id, 'Le silence stratégique, sans hésiter. 90% des prospects comblent le silence en donnant la vraie raison.', NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), post_3, admin_id, 'Essaie la vidéo personnalisée (30 secondes max). Mon taux de réponse est passé de 10% à 45% avec cette méthode.', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), post_3, admin_id, 'Le framework "3-3-7" : relance J+3 (email récap), J+6 (LinkedIn + valeur), J+13 (break-up). Ne relance jamais sans apporter de la valeur.', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), post_4, admin_id, 'Oui partage ton process ! C''est exactement ce dont j''ai besoin pour structurer ma prospection.', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), post_5, admin_id, 'J''ajouterais Calendly pour la prise de RDV et Loom pour les vidéos de relance. Game changer !', NOW() - INTERVAL '12 hours')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 14. DAILY JOURNALS (10 derniers jours)
-- =========================================================================
INSERT INTO daily_journals (id, user_id, date, mood, wins, struggles, goals_tomorrow, conversations_count, created_at)
VALUES
  (gen_random_uuid(), admin_id, CURRENT_DATE - 9, 4, 'Closé un deal à 4 500€ — nouveau record perso', 'Un no-show sur le créneau de 14h', 'Relancer les 3 prospects LinkedIn chauds', 12, NOW() - INTERVAL '9 days'),
  (gen_random_uuid(), admin_id, CURRENT_DATE - 8, 5, '3 appels découverte bookés, all via LinkedIn', 'RAS — journée productive', 'Préparer le closing pour demain', 15, NOW() - INTERVAL '8 days'),
  (gen_random_uuid(), admin_id, CURRENT_DATE - 7, 3, 'Bonne session de roleplay avec l''IA', 'Difficulté à gérer l''objection budget sur un gros deal', 'Revoir le module gestion des objections', 8, NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), admin_id, CURRENT_DATE - 6, 4, 'Contrat Premium signé — Karim Benali', 'Démotivé en début de journée, remotivé après le closing', 'Prospecter 15 nouveaux profils LinkedIn', 11, NOW() - INTERVAL '6 days'),
  (gen_random_uuid(), admin_id, CURRENT_DATE - 5, 4, '15 DMs envoyés, 4 réponses', 'Un prospect a annulé son RDV de closing', 'Relancer Nadia Kermiche pour la signature', 14, NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), admin_id, CURRENT_DATE - 4, 3, 'Bon call de groupe sur le pricing', 'Taux de réponse LinkedIn en baisse cette semaine', 'Tester un nouveau template d''accroche', 9, NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), admin_id, CURRENT_DATE - 3, 5, 'Meilleur jour de prospection : 22 DMs, 6 réponses', 'Rien de négatif — flow state toute la journée', 'Convertir les 6 réponses en appels', 22, NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), admin_id, CURRENT_DATE - 2, 4, '2 nouveaux appels bookés', 'Proposition refusée par un prospect froid', 'Préparer le pitch pour Sophie Martin', 10, NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), admin_id, CURRENT_DATE - 1, 4, 'Atteint le streak de 12 jours !', 'Procrastiné 1h sur le CRM', 'Closer Sophie Martin et Thomas Girard', 13, NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), admin_id, CURRENT_DATE, 5, 'Journée chargée — 2 closings prévus', '', 'Boucler les 2 closings et envoyer les contrats', 0, NOW())
ON CONFLICT (user_id, date) DO NOTHING;

-- =========================================================================
-- 15. CLIENT KPIs (snapshots mensuels)
-- =========================================================================
INSERT INTO client_kpis (id, client_id, date, bookings_count, show_up_rate, closing_rate, revenue_signed, created_at) VALUES
  (gen_random_uuid(), admin_id, '2026-01-01', 8, 75.0, 25.0, 2500, NOW() - INTERVAL '70 days'),
  (gen_random_uuid(), admin_id, '2026-01-15', 12, 83.3, 33.3, 5200, NOW() - INTERVAL '55 days'),
  (gen_random_uuid(), admin_id, '2026-02-01', 15, 86.7, 40.0, 8900, NOW() - INTERVAL '40 days'),
  (gen_random_uuid(), admin_id, '2026-02-15', 18, 88.9, 44.4, 12400, NOW() - INTERVAL '25 days'),
  (gen_random_uuid(), admin_id, '2026-03-01', 22, 90.9, 50.0, 17100, NOW() - INTERVAL '12 days'),
  (gen_random_uuid(), admin_id, '2026-03-10', 25, 92.0, 52.0, 21600, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 16. CONTENT POSTS (publications programmées)
-- =========================================================================
INSERT INTO content_posts (id, title, content, platform, framework, status, scheduled_at, published_at, metrics, created_by, created_at) VALUES
  (gen_random_uuid(), 'Les 3 erreurs qui tuent vos appels de prospection',
   'Erreur 1 : Parler de soi avant de comprendre le prospect.\nErreur 2 : Envoyer un lien dans le premier message.\nErreur 3 : Abandonner après une seule relance.\n\nLa vérité ? 80% des ventes se font après la 5ème relance.',
   'linkedin', 'PAS (Problem-Agitate-Solve)', 'published',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days',
   '{"likes": 47, "comments": 12, "shares": 8, "impressions": 2340}'::jsonb,
   admin_id, NOW() - INTERVAL '12 days'),

  (gen_random_uuid(), 'Comment j''ai closé 8 900€ en un seul appel',
   'La semaine dernière, j''ai closé un deal à 8 900€ en 45 minutes.\n\nVoici exactement ce que j''ai fait :\n1. 15 min de découverte (questions SPIN)\n2. 10 min de projection (ROI chiffré)\n3. 5 min de proposition\n4. 15 min de gestion d''objections\n\nLe moment clé ? Quand le prospect a dit "c''est cher". Ma réponse : le silence. 7 secondes. Puis il a dit "mais ça vaut le coup".',
   'linkedin', 'Storytelling', 'published',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days',
   '{"likes": 89, "comments": 23, "shares": 15, "impressions": 4520}'::jsonb,
   admin_id, NOW() - INTERVAL '7 days'),

  (gen_random_uuid(), 'Le framework BANT est mort. Voici ce qui le remplace.',
   'En 2026, qualifier avec BANT c''est comme prospecter par fax.\n\nVoici le framework MEDDIC adapté au marché français :\n- Metrics : quels KPIs veut-il améliorer ?\n- Economic Buyer : qui signe le chèque ?\n- Decision criteria : sur quoi il compare ?\n- Decision process : combien d''étapes avant signature ?\n- Identify pain : quelle douleur concrète ?\n- Champion : qui défend votre solution en interne ?\n\nSauvegardez ce post. Vous me remercierez.',
   'linkedin', 'Contrarian', 'scheduled',
   NOW() + INTERVAL '2 days', NULL, NULL,
   admin_id, NOW() - INTERVAL '1 day'),

  (gen_random_uuid(), 'Story : coulisses d''une journée de closer',
   'Morning routine → Préparation appels → 3 calls découverte → Déjeuner rapide → 2 closings → Debrief → Journaling. Le tout filmé pour vous montrer la réalité du métier.',
   'instagram', 'Behind the scenes', 'scheduled',
   NOW() + INTERVAL '5 days', NULL, NULL,
   admin_id, NOW())
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 17. WHATSAPP SEQUENCES
-- =========================================================================
INSERT INTO whatsapp_sequences (id, name, description, funnel_type, steps, is_active, created_by, created_at) VALUES
  (wa_seq_1, 'Relance post-appel découverte',
   'Séquence automatique après un appel découverte. Récap + proposition + relance.',
   'post_call',
   '[{"delay_minutes": 30, "message": "Merci pour notre échange ! Comme promis, voici le récapitulatif de ce qu''on a vu ensemble..."},
     {"delay_minutes": 1440, "message": "J''espère que vous avez pu réfléchir à notre discussion. Voici une étude de cas qui devrait vous intéresser 👇"},
     {"delay_minutes": 4320, "message": "Juste un petit message pour savoir si vous avez des questions avant qu''on avance ?"},
     {"delay_minutes": 10080, "message": "Je ne veux pas être insistant, mais je préfère savoir : est-ce qu''on avance ensemble ou pas ? Un simple oui/non me suffit 🙏"}]'::jsonb,
   true, admin_id, NOW() - INTERVAL '25 days'),

  (wa_seq_2, 'Nurturing lead froid',
   'Séquence de réchauffement pour les leads froids. Contenu de valeur progressif.',
   'nurturing',
   '[{"delay_minutes": 0, "message": "Salut ! J''ai pensé à toi en voyant cette ressource sur [sujet]. Ça pourrait t''aider pour [problème]."},
     {"delay_minutes": 4320, "message": "Un truc rapide qui pourrait t''intéresser : [astuce concrète]. Ça a aidé un de mes clients à doubler ses résultats."},
     {"delay_minutes": 10080, "message": "J''ai un créneau qui s''est libéré cette semaine. On se fait un call rapide de 15 min pour voir comment je peux t''aider ? Sans engagement."}]'::jsonb,
   true, admin_id, NOW() - INTERVAL '15 days')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 18. SCRIPT FLOWCHARTS
-- =========================================================================
INSERT INTO script_flowcharts (id, title, description, nodes, edges, category, is_template, created_by, created_at) VALUES
  (flow_1, 'Script appel de closing B2B',
   'Flowchart complet pour un appel de closing : de l''introduction à la signature.',
   '[{"id": "1", "type": "input", "position": {"x": 250, "y": 0}, "data": {"label": "Introduction (30s)"}},
     {"id": "2", "position": {"x": 250, "y": 100}, "data": {"label": "Rappel du contexte"}},
     {"id": "3", "position": {"x": 250, "y": 200}, "data": {"label": "Récap des besoins identifiés"}},
     {"id": "4", "position": {"x": 250, "y": 300}, "data": {"label": "Présentation de la solution"}},
     {"id": "5", "position": {"x": 250, "y": 400}, "data": {"label": "Annonce du prix"}},
     {"id": "6", "position": {"x": 100, "y": 500}, "data": {"label": "Objection prix"}},
     {"id": "7", "position": {"x": 400, "y": 500}, "data": {"label": "Objection timing"}},
     {"id": "8", "position": {"x": 250, "y": 600}, "data": {"label": "Traitement objection"}},
     {"id": "9", "position": {"x": 100, "y": 700}, "data": {"label": "Oui → Signature"}},
     {"id": "10", "position": {"x": 400, "y": 700}, "data": {"label": "Non → Follow-up planifié"}}]'::jsonb,
   '[{"id": "e1-2", "source": "1", "target": "2"},
     {"id": "e2-3", "source": "2", "target": "3"},
     {"id": "e3-4", "source": "3", "target": "4"},
     {"id": "e4-5", "source": "4", "target": "5"},
     {"id": "e5-6", "source": "5", "target": "6", "label": "Trop cher"},
     {"id": "e5-7", "source": "5", "target": "7", "label": "Pas maintenant"},
     {"id": "e6-8", "source": "6", "target": "8"},
     {"id": "e7-8", "source": "7", "target": "8"},
     {"id": "e8-9", "source": "8", "target": "9", "label": "Accepté"},
     {"id": "e8-10", "source": "8", "target": "10", "label": "Refusé"}]'::jsonb,
   'Closing', false, admin_id, NOW() - INTERVAL '20 days'),

  (flow_2, 'Qualification de prospect LinkedIn',
   'Arbre de décision pour qualifier un prospect à partir de son profil LinkedIn.',
   '[{"id": "1", "type": "input", "position": {"x": 250, "y": 0}, "data": {"label": "Profil identifié"}},
     {"id": "2", "position": {"x": 250, "y": 100}, "data": {"label": "Vérifier : décideur ?"}},
     {"id": "3", "position": {"x": 100, "y": 200}, "data": {"label": "Non → Chercher le décideur"}},
     {"id": "4", "position": {"x": 400, "y": 200}, "data": {"label": "Oui → Vérifier la niche"}},
     {"id": "5", "position": {"x": 400, "y": 300}, "data": {"label": "Niche compatible ?"}},
     {"id": "6", "position": {"x": 250, "y": 400}, "data": {"label": "Oui → Analyser l''activité"}},
     {"id": "7", "position": {"x": 550, "y": 400}, "data": {"label": "Non → Disqualifié"}},
     {"id": "8", "position": {"x": 250, "y": 500}, "data": {"label": "Actif sur LinkedIn ?"}},
     {"id": "9", "position": {"x": 100, "y": 600}, "data": {"label": "Oui → Prospect HOT"}},
     {"id": "10", "position": {"x": 400, "y": 600}, "data": {"label": "Non → Prospect WARM"}}]'::jsonb,
   '[{"id": "e1-2", "source": "1", "target": "2"},
     {"id": "e2-3", "source": "2", "target": "3", "label": "Non"},
     {"id": "e2-4", "source": "2", "target": "4", "label": "Oui"},
     {"id": "e4-5", "source": "4", "target": "5"},
     {"id": "e5-6", "source": "5", "target": "6", "label": "Oui"},
     {"id": "e5-7", "source": "5", "target": "7", "label": "Non"},
     {"id": "e6-8", "source": "6", "target": "8"},
     {"id": "e8-9", "source": "8", "target": "9", "label": "Oui"},
     {"id": "e8-10", "source": "8", "target": "10", "label": "Non"}]'::jsonb,
   'Prospection', false, admin_id, NOW() - INTERVAL '15 days')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 19. NPS SURVEYS
-- =========================================================================
INSERT INTO nps_surveys (id, client_id, score, comment, trigger_day, sent_at, responded_at, created_at) VALUES
  (gen_random_uuid(), admin_id, 9, 'Excellent accompagnement, les scripts sont très efficaces. Seul bémol : j''aurais aimé plus de sessions de roleplay en live.', 30, NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '30 days'),
  (gen_random_uuid(), admin_id, 10, 'La meilleure formation commerciale que j''ai suivie. Le ROI est déjà au rendez-vous après 2 mois.', 60, NOW() - INTERVAL '15 days', NOW() - INTERVAL '13 days', NOW() - INTERVAL '15 days')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 20. TESTIMONIALS
-- =========================================================================
INSERT INTO testimonials (id, client_id, content, status, created_at) VALUES
  (gen_random_uuid(), admin_id, 'Sales System a complètement transformé ma façon de prospecter. En 3 mois, j''ai triplé mon nombre de prospects qualifiés et doublé mon CA. Les scripts et le coaching sont d''un niveau exceptionnel.', 'published', NOW() - INTERVAL '20 days'),
  (gen_random_uuid(), admin_id, 'Je recommande à 100%. L''approche est structurée, les outils sont puissants, et la communauté est incroyablement motivante. Mon taux de closing est passé de 15% à 42% en 2 mois.', 'published', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 21. COACHING OBJECTIVES
-- =========================================================================
INSERT INTO coaching_objectives (id, assignee_id, created_by, title, description, category, target_value, current_value, target_date, status, created_at) VALUES
  (gen_random_uuid(), admin_id, admin_id, 'Atteindre 25 appels/semaine',
   'Augmenter le volume d''appels de prospection pour atteindre 25 appels par semaine de manière régulière.',
   'calls', 25, 18, (CURRENT_DATE + INTERVAL '30 days')::DATE, 'in_progress', NOW() - INTERVAL '14 days'),
  (gen_random_uuid(), admin_id, admin_id, 'Taux de closing à 50%',
   'Améliorer le taux de closing en travaillant la gestion des objections et le timing de la proposition.',
   'deals', 50, 42, (CURRENT_DATE + INTERVAL '45 days')::DATE, 'in_progress', NOW() - INTERVAL '14 days'),
  (gen_random_uuid(), admin_id, admin_id, 'CA mensuel : 15 000 €',
   'Atteindre un chiffre d''affaires mensuel récurrent de 15 000 € signé.',
   'revenue', 15000, 12400, (CURRENT_DATE + INTERVAL '60 days')::DATE, 'in_progress', NOW() - INTERVAL '14 days'),
  (gen_random_uuid(), admin_id, admin_id, 'Maîtriser le closing B2B',
   'Compléter 100% du cours closing B2B + 10 sessions de roleplay avec score > 80.',
   'skills', 100, 75, (CURRENT_DATE + INTERVAL '21 days')::DATE, 'in_progress', NOW() - INTERVAL '21 days')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 22. DEAL ACTIVITIES (historique sur les deals existants)
-- =========================================================================
-- On récupère les IDs des deals existants pour y ajouter des activités
INSERT INTO deal_activities (id, deal_id, user_id, type, content, created_at)
SELECT gen_random_uuid(), d.id, admin_id, 'note', 'Premier contact établi via LinkedIn. Le prospect est intéressé par l''accompagnement.', d.created_at + INTERVAL '1 day'
FROM deals d WHERE d.title = 'Accompagnement commercial TechVision' LIMIT 1;

INSERT INTO deal_activities (id, deal_id, user_id, type, content, created_at)
SELECT gen_random_uuid(), d.id, admin_id, 'call', 'Appel découverte de 30 min. Besoin identifié : structurer le process commercial. Budget validé.', d.created_at + INTERVAL '3 days'
FROM deals d WHERE d.title = 'Accompagnement commercial TechVision' LIMIT 1;

INSERT INTO deal_activities (id, deal_id, user_id, type, content, created_at)
SELECT gen_random_uuid(), d.id, admin_id, 'email', 'Proposition commerciale envoyée — Pack Standard 4 500 €.', d.created_at + INTERVAL '5 days'
FROM deals d WHERE d.title = 'Accompagnement commercial TechVision' LIMIT 1;

INSERT INTO deal_activities (id, deal_id, user_id, type, content, created_at)
SELECT gen_random_uuid(), d.id, admin_id, 'note', 'Rencontré au Salon Entrepreneurs Paris. Intéressé par une formation pour son équipe de 8 commerciaux.', d.created_at + INTERVAL '1 day'
FROM deals d WHERE d.title = 'Formation closing — Groupe Moreau Distribution' LIMIT 1;

INSERT INTO deal_activities (id, deal_id, user_id, type, content, created_at)
SELECT gen_random_uuid(), d.id, admin_id, 'call', 'Call de closing réussi ! Émilie signe le pack prospection LinkedIn. Contrat envoyé.', d.created_at + INTERVAL '2 days'
FROM deals d WHERE d.title LIKE 'Pack prospection%' LIMIT 1;

INSERT INTO deal_activities (id, deal_id, user_id, type, content, created_at)
SELECT gen_random_uuid(), d.id, admin_id, 'status_change', 'Deal passé en "Client Signé". Contrat signé le 21/02. Démarrage audit le 03/03.', d.created_at + INTERVAL '1 day'
FROM deals d WHERE d.title LIKE 'Audit tunnel%' LIMIT 1;

-- =========================================================================
-- 23. OBJECTIONS LIBRARY
-- =========================================================================
INSERT INTO objections (id, objection, best_responses, category, created_at) VALUES
  (gen_random_uuid(), 'C''est trop cher',
   '[{"response": "Je comprends. Trop cher par rapport à quoi exactement ?", "effectiveness_score": 85},
     {"response": "Si le prix n''était pas un frein, est-ce que la solution vous conviendrait ?", "effectiveness_score": 78},
     {"response": "Quel serait le coût de ne rien changer dans les 6 prochains mois ?", "effectiveness_score": 90}]'::jsonb,
   'Prix', NOW() - INTERVAL '30 days'),

  (gen_random_uuid(), 'Je dois réfléchir',
   '[{"response": "Bien sûr. Pour que votre réflexion soit éclairée, qu''est-ce qui vous fait encore hésiter ?", "effectiveness_score": 82},
     {"response": "Réfléchir à quoi précisément ? Je peux peut-être clarifier un point.", "effectiveness_score": 88},
     {"response": "Je comprends. Fixons un créneau dans 48h pour en reparler ?", "effectiveness_score": 75}]'::jsonb,
   'Hésitation', NOW() - INTERVAL '28 days'),

  (gen_random_uuid(), 'On travaille déjà avec quelqu''un',
   '[{"response": "Super ! Qu''est-ce qui fonctionne bien avec votre prestataire actuel ?", "effectiveness_score": 80},
     {"response": "S''il y avait une chose à améliorer dans votre accompagnement actuel, ce serait quoi ?", "effectiveness_score": 87},
     {"response": "C''est une bonne chose. Beaucoup de nos clients travaillent aussi avec d''autres. L''idée n''est pas de remplacer mais de compléter.", "effectiveness_score": 72}]'::jsonb,
   'Concurrence', NOW() - INTERVAL '25 days'),

  (gen_random_uuid(), 'Envoyez-moi un email',
   '[{"response": "Avec plaisir. Pour qu''il soit pertinent, quel est votre principal enjeu sur [sujet] ?", "effectiveness_score": 85},
     {"response": "Bien sûr. Mais avant, une question rapide pour personnaliser : quel est votre objectif n°1 pour les 90 prochains jours ?", "effectiveness_score": 90},
     {"response": "D''accord. Mais entre nous, les emails se perdent. Que diriez-vous d''un call de 10 min ? Je vous enverrai le récap ensuite.", "effectiveness_score": 78}]'::jsonb,
   'Évitement', NOW() - INTERVAL '22 days'),

  (gen_random_uuid(), 'Ce n''est pas le bon moment',
   '[{"response": "Je comprends. À quel horizon ce sujet redeviendra prioritaire ?", "effectiveness_score": 75},
     {"response": "Quand sera le bon moment selon vous ? D''ici là, je peux vous envoyer du contenu utile.", "effectiveness_score": 80},
     {"response": "Il n''y a jamais de moment parfait. Mais est-ce que le problème qu''on a identifié peut attendre sans vous coûter de l''argent ?", "effectiveness_score": 88}]'::jsonb,
   'Timing', NOW() - INTERVAL '20 days')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 24. ATTRIBUTION EVENTS (multi-touch)
-- =========================================================================
INSERT INTO attribution_events (id, touchpoint_type, channel, metadata, created_at)
SELECT gen_random_uuid(), 'first_touch', 'linkedin',
  '{"campaign": "Prospection LinkedIn B2B", "content": "Message accroche personnalisé"}'::jsonb,
  d.created_at
FROM deals d LIMIT 1;

INSERT INTO attribution_events (id, touchpoint_type, channel, metadata, created_at)
SELECT gen_random_uuid(), 'lead_conversion', 'website',
  '{"page": "/book/damien-reynaud", "referrer": "linkedin.com"}'::jsonb,
  d.created_at + INTERVAL '3 days'
FROM deals d LIMIT 1;

INSERT INTO attribution_events (id, touchpoint_type, channel, metadata, created_at) VALUES
  (gen_random_uuid(), 'first_touch', 'instagram', '{"campaign": "Story coaching", "content": "Réponse story"}'::jsonb, NOW() - INTERVAL '25 days'),
  (gen_random_uuid(), 'first_touch', 'linkedin', '{"campaign": "Prospection B2B", "content": "Message personnalisé"}'::jsonb, NOW() - INTERVAL '20 days'),
  (gen_random_uuid(), 'lead_conversion', 'email', '{"campaign": "Newsletter", "content": "Étude de cas"}'::jsonb, NOW() - INTERVAL '15 days'),
  (gen_random_uuid(), 'first_touch', 'referral', '{"source": "Client existant", "referrer": "Karim Benali"}'::jsonb, NOW() - INTERVAL '18 days'),
  (gen_random_uuid(), 'first_touch', 'salon', '{"event": "Salon Entrepreneurs Paris 2026", "booth": "Stand A12"}'::jsonb, NOW() - INTERVAL '20 days'),
  (gen_random_uuid(), 'lead_conversion', 'linkedin', '{"campaign": "Post LinkedIn", "content": "Article erreurs closing"}'::jsonb, NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 25. MIND MAPS
-- =========================================================================
INSERT INTO mind_maps (id, title, description, nodes, edges, category, created_by, created_at) VALUES
  (gen_random_uuid(), 'Processus de vente complet',
   'Vue d''ensemble du cycle de vente : de la prospection au closing.',
   '[{"id": "center", "position": {"x": 400, "y": 300}, "data": {"label": "Processus de vente"}},
     {"id": "prospection", "position": {"x": 100, "y": 100}, "data": {"label": "Prospection"}},
     {"id": "qualification", "position": {"x": 700, "y": 100}, "data": {"label": "Qualification"}},
     {"id": "decouverte", "position": {"x": 100, "y": 500}, "data": {"label": "Appel découverte"}},
     {"id": "proposition", "position": {"x": 700, "y": 500}, "data": {"label": "Proposition"}},
     {"id": "closing", "position": {"x": 400, "y": 600}, "data": {"label": "Closing"}}]'::jsonb,
   '[{"id": "e1", "source": "center", "target": "prospection"},
     {"id": "e2", "source": "center", "target": "qualification"},
     {"id": "e3", "source": "center", "target": "decouverte"},
     {"id": "e4", "source": "center", "target": "proposition"},
     {"id": "e5", "source": "center", "target": "closing"}]'::jsonb,
   'Vente', admin_id, NOW() - INTERVAL '25 days')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 26. AUDIT LOG (quelques entrées récentes)
-- =========================================================================
INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES
  (gen_random_uuid(), admin_id, 'deal.created', 'deal', NULL, '{"title": "Accompagnement TechVision", "value": 4500}'::jsonb, NOW() - INTERVAL '12 days'),
  (gen_random_uuid(), admin_id, 'deal.stage_changed', 'deal', NULL, '{"from": "Contacté", "to": "Proposition"}'::jsonb, NOW() - INTERVAL '8 days'),
  (gen_random_uuid(), admin_id, 'contract.signed', 'contract', contract_1, '{"amount": 4500, "client": "Claire Dubois"}'::jsonb, NOW() - INTERVAL '28 days'),
  (gen_random_uuid(), admin_id, 'payment.received', 'payment', NULL, '{"amount": 2225, "client": "Karim Benali"}'::jsonb, NOW() - INTERVAL '12 days'),
  (gen_random_uuid(), admin_id, 'booking.created', 'booking', NULL, '{"prospect": "Sophie Martin", "type": "decouverte"}'::jsonb, NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), admin_id, 'prospect.status_changed', 'prospect', prospect_1, '{"from": "contacted", "to": "booked"}'::jsonb, NOW() - INTERVAL '10 days'),
  (gen_random_uuid(), admin_id, 'user.login', 'profile', admin_id, '{"ip": "90.112.xx.xx", "device": "Desktop Chrome"}'::jsonb, NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), admin_id, 'course.lesson_completed', 'lesson', lesson_4, '{"course": "L''art du closing en B2B", "score": 88}'::jsonb, NOW() - INTERVAL '35 days')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 27. DEVELOPMENT PLANS
-- =========================================================================
INSERT INTO development_plans (id, user_id, skills, actions, resources, created_at) VALUES
  (gen_random_uuid(), admin_id,
   '[{"name": "Prospection LinkedIn", "level": 85, "target": 95},
     {"name": "Closing B2B", "level": 70, "target": 90},
     {"name": "Gestion des objections", "level": 75, "target": 90},
     {"name": "Négociation", "level": 60, "target": 80},
     {"name": "Copywriting", "level": 50, "target": 75}]'::jsonb,
   '[{"id": "1", "title": "Compléter le cours Closing B2B", "description": "Terminer les 2 leçons restantes + quiz", "priority": "high", "done": false},
     {"id": "2", "title": "10 sessions de roleplay IA", "description": "Pratiquer avec les profils difficiles (Marie, Sophie)", "priority": "high", "done": false},
     {"id": "3", "title": "Analyser 5 appels de closing enregistrés", "description": "Écouter et noter les points d''amélioration", "priority": "medium", "done": true},
     {"id": "4", "title": "Lire The Challenger Sale", "description": "Livre recommandé par le coach", "priority": "low", "done": false}]'::jsonb,
   '[{"title": "Cours : L''art du closing en B2B", "url": "/academy", "type": "course"},
     {"title": "Script de closing B2B", "url": "/scripts", "type": "script"},
     {"title": "Webinaire Pipeline Prévisible", "url": "/chat/replays", "type": "replay"}]'::jsonb,
   NOW() - INTERVAL '21 days')
ON CONFLICT (user_id) DO UPDATE SET
  skills = EXCLUDED.skills, actions = EXCLUDED.actions, resources = EXCLUDED.resources;

-- =========================================================================
-- 28. WELCOME PACKS
-- =========================================================================
INSERT INTO welcome_packs (id, target_role, items, is_active, created_at) VALUES
  (gen_random_uuid(), 'client_b2b',
   '[{"title": "Guide de démarrage Sales System", "type": "pdf", "url": "/resources"},
     {"title": "Vidéo de bienvenue", "type": "video", "url": "/academy"},
     {"title": "Script de prospection B2B", "type": "script", "url": "/scripts"},
     {"title": "Accès communauté", "type": "link", "url": "/community/forum"}]'::jsonb,
   true, NOW() - INTERVAL '60 days'),
  (gen_random_uuid(), 'client_b2c',
   '[{"title": "Guide de démarrage rapide", "type": "pdf", "url": "/resources"},
     {"title": "Vidéo de bienvenue", "type": "video", "url": "/academy"},
     {"title": "Planifier votre premier appel", "type": "link", "url": "/bookings"}]'::jsonb,
   true, NOW() - INTERVAL '60 days')
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Seed demo complet inséré avec succès !';
END $$;
