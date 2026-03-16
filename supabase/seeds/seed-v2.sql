-- =============================================================================
-- seed-v2.sql — Données de démonstration pour Sales System v2
-- Admin user: f40e1dc7-939c-4edb-a3bc-bae93c88f844
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. roleplay_prospect_profiles (5 rows)
-- Columns: id, name, persona, niche, difficulty, objection_types, network, context, created_by
-- ---------------------------------------------------------------------------
INSERT INTO roleplay_prospect_profiles (id, name, persona, niche, difficulty, objection_types, network, context, created_by)
VALUES
  (gen_random_uuid(),
   'Marie Lefèvre — DRH sceptique',
   'Marie est directrice des ressources humaines dans une PME industrielle de 120 salariés. Elle a déjà été échaudée par un prestataire de formation qui n''a pas tenu ses promesses. Elle demande des preuves concrètes de ROI avant tout engagement.',
   'Ressources humaines',
   'difficile',
   ARRAY['prix', 'confiance', 'ROI'],
   'linkedin',
   '{"scenario": "Prospection téléphonique à froid — premier contact. Marie décroche entre deux réunions et dispose de 3 minutes maximum."}'::jsonb,
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844'),

  (gen_random_uuid(),
   'Thomas Girard — Gérant curieux',
   'Thomas dirige une agence web de 8 personnes à Lyon. Il est technophile, ouvert aux nouveautés, mais très sensible au rapport qualité-prix. Il consulte systématiquement son associé.',
   'Agence digitale',
   'moyen',
   ARRAY['prix', 'délai', 'concurrence'],
   'linkedin',
   '{"scenario": "Thomas a téléchargé un livre blanc depuis votre site et a laissé ses coordonnées. Vous le rappelez dans les 24 h."}'::jsonb,
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844'),

  (gen_random_uuid(),
   'Sophie Martin — Directrice commerciale pressée',
   'Sophie manage une équipe de 15 commerciaux dans une ESN. Elle est constamment sollicitée, parle vite et attend des réponses précises. Si vous ne captez pas son attention en 30 secondes, elle raccroche.',
   'Services numériques',
   'difficile',
   ARRAY['temps', 'pertinence', 'engagement'],
   'linkedin',
   '{"scenario": "Appel de qualification suite à une demande entrante via LinkedIn. Sophie a liké un de vos posts mais n''a jamais échangé avec vous."}'::jsonb,
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844'),

  (gen_random_uuid(),
   'Jean-Pierre Durand — Artisan prudent',
   'Jean-Pierre est plombier-chauffagiste à son compte depuis 20 ans. Il n''est pas à l''aise avec le digital et se méfie des vendeurs de rêve. Il a besoin d''exemples concrets de son secteur.',
   'Artisanat / BTP',
   'facile',
   ARRAY['budget', 'complexité', 'besoin'],
   'instagram',
   '{"scenario": "Rencontre sur un salon professionnel. Jean-Pierre s''est arrêté devant votre stand par curiosité."}'::jsonb,
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844'),

  (gen_random_uuid(),
   'Amina Benali — Fondatrice ambitieuse',
   'Amina a lancé sa marque de cosmétiques bio il y a 18 mois. Elle réalise 30 k€ de CA mensuel en e-commerce et veut passer à 100 k€. Elle est très orientée données et négocie fermement les tarifs.',
   'E-commerce / Cosmétiques',
   'moyen',
   ARRAY['prix', 'scalabilité', 'résultats'],
   'instagram',
   '{"scenario": "Amina vous a été recommandée par un client existant. Vous la contactez par message Instagram."}'::jsonb,
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- 2. resource_library (8 rows)
-- Columns: id, title, resource_type, url, description, tags, category, created_at
-- ---------------------------------------------------------------------------
INSERT INTO resource_library (id, title, resource_type, url, description, tags, category, created_at)
VALUES
  (gen_random_uuid(), 'Guide complet de la prospection LinkedIn', 'pdf',
   'https://storage.sales-system.app/resources/guide-prospection-linkedin.pdf',
   'Un guide de 45 pages couvrant l''optimisation du profil, la recherche de prospects et la rédaction de messages d''accroche.',
   ARRAY['linkedin', 'prospection', 'guide'], 'Prospection', NOW() - INTERVAL '30 days'),

  (gen_random_uuid(), 'Masterclass : Closer un deal en 5 étapes', 'video',
   'https://storage.sales-system.app/resources/masterclass-closing-5-etapes.mp4',
   'Vidéo de formation de 52 minutes présentée par un expert en closing avec des mises en situation réelles.',
   ARRAY['closing', 'vidéo', 'formation'], 'Closing', NOW() - INTERVAL '25 days'),

  (gen_random_uuid(), 'Podcast — Les objections prix décryptées', 'audio',
   'https://storage.sales-system.app/resources/podcast-objections-prix.mp3',
   'Épisode de 38 minutes analysant les 7 objections prix les plus courantes avec des réponses prêtes à l''emploi.',
   ARRAY['objections', 'prix', 'podcast'], 'Objections', NOW() - INTERVAL '20 days'),

  (gen_random_uuid(), 'Script d''appel à froid — B2B SaaS', 'script',
   'https://storage.sales-system.app/resources/script-appel-froid-b2b-saas.pdf',
   'Script structuré pour les appels de prospection à froid ciblant les décideurs SaaS B2B.',
   ARRAY['script', 'appel à froid', 'B2B'], 'Scripts', NOW() - INTERVAL '18 days'),

  (gen_random_uuid(), 'Modèle de proposition commerciale', 'pdf',
   'https://storage.sales-system.app/resources/modele-proposition-commerciale.pdf',
   'Template de proposition commerciale avec sections personnalisables : contexte, solution, tarification.',
   ARRAY['proposition', 'template', 'document'], 'Documents commerciaux', NOW() - INTERVAL '15 days'),

  (gen_random_uuid(), 'Webinaire : Construire un pipeline prévisible', 'video',
   'https://storage.sales-system.app/resources/webinaire-pipeline-previsible.mp4',
   'Replay d''un webinaire de 1h15 sur la construction d''un pipeline de vente prévisible à 90 jours.',
   ARRAY['pipeline', 'webinaire', 'stratégie'], 'Stratégie commerciale', NOW() - INTERVAL '10 days'),

  (gen_random_uuid(), 'Audio — Techniques de reformulation avancées', 'audio',
   'https://storage.sales-system.app/resources/audio-reformulation-avancee.mp3',
   'Capsule audio de 22 minutes détaillant les techniques de reformulation avec des exemples de vrais appels.',
   ARRAY['reformulation', 'écoute active', 'technique'], 'Techniques de vente', NOW() - INTERVAL '5 days'),

  (gen_random_uuid(), 'Script de relance post-démo', 'script',
   'https://storage.sales-system.app/resources/script-relance-post-demo.pdf',
   'Séquence de 4 messages de relance (email + LinkedIn) à envoyer après une démonstration produit.',
   ARRAY['relance', 'script', 'post-démo'], 'Scripts', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- 3. revision_cards (8 rows)
-- Columns: id, question, answer, category, created_at (no difficulty column)
-- ---------------------------------------------------------------------------
INSERT INTO revision_cards (id, question, answer, category, created_at)
VALUES
  (gen_random_uuid(),
   'Quelles sont les 4 étapes de la méthode SPIN Selling ?',
   'Situation — Problème — Implication — Need-payoff (Besoin-bénéfice). On commence par comprendre le contexte, puis on identifie les problèmes, on explore les conséquences, et on fait émerger la valeur de la solution.',
   'Méthodologies de vente', NOW() - INTERVAL '28 days'),

  (gen_random_uuid(),
   'Comment répondre à l''objection « C''est trop cher » ?',
   '1) Accuser réception. 2) Questionner : « Trop cher par rapport à quoi ? » 3) Recadrer sur la valeur et le ROI. 4) Proposer des options (échelonnement, version allégée).',
   'Gestion des objections', NOW() - INTERVAL '26 days'),

  (gen_random_uuid(),
   'Qu''est-ce que le taux de conversion et comment le calculer ?',
   'Le taux de conversion = (Nombre de conversions / Nombre total de prospects à l''étape précédente) × 100. Exemple : 10 deals signés sur 50 propositions = 20 % de taux de closing.',
   'KPIs commerciaux', NOW() - INTERVAL '24 days'),

  (gen_random_uuid(),
   'Citez 3 techniques d''écoute active en rendez-vous commercial.',
   '1) La reformulation miroir. 2) Le silence stratégique (3-5 secondes). 3) La prise de notes visible devant le prospect.',
   'Techniques de vente', NOW() - INTERVAL '22 days'),

  (gen_random_uuid(),
   'Quelle est la différence entre un MQL et un SQL ?',
   'MQL = qualifié par le marketing (comportement). SQL = validé par le commercial après un échange confirmant besoin, budget, décision, calendrier (critères BANT).',
   'Qualification', NOW() - INTERVAL '18 days'),

  (gen_random_uuid(),
   'Quels sont les éléments clés d''un bon message de prospection LinkedIn ?',
   '1) Accroche personnalisée. 2) Proposition de valeur en une phrase. 3) Preuve sociale courte. 4) Appel à l''action simple (question ouverte, pas de lien).',
   'Prospection digitale', NOW() - INTERVAL '14 days'),

  (gen_random_uuid(),
   'Qu''est-ce que la méthode MEDDIC et quand l''utiliser ?',
   'MEDDIC : Metrics, Economic Buyer, Decision criteria, Decision process, Identify pain, Champion. Utilisée en ventes complexes B2B (cycles longs, paniers élevés).',
   'Méthodologies de vente', NOW() - INTERVAL '10 days'),

  (gen_random_uuid(),
   'Comment structurer un appel de découverte efficace ?',
   '1) Introduction (30s). 2) Découverte (15 min) : questions ouvertes. 3) Récapitulatif (3 min). 4) Projection (5 min). 5) Prochaine étape (2 min).',
   'Techniques de vente', NOW() - INTERVAL '5 days')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- 4. script_templates (3 rows)
-- Columns: id, title, category, niche, network, content (text), flowchart_data (jsonb), is_public
-- ---------------------------------------------------------------------------
INSERT INTO script_templates (id, title, category, niche, network, content, is_public, created_at)
VALUES
  (gen_random_uuid(),
   'Appel de découverte B2B',
   'Prospection', 'SaaS B2B', 'linkedin',
   E'## Introduction (30 secondes)\n\nBonjour [Prénom], c''est [Votre nom] de [Entreprise]. Merci d''avoir accepté cet échange.\n\n## Contexte et permission (1 minute)\n\nPour que notre échange soit le plus utile possible, j''aimerais d''abord comprendre votre situation.\n\n## Questions de découverte (12 minutes)\n\n1. Pouvez-vous me décrire votre processus commercial actuel ?\n2. Quels sont vos objectifs de CA pour les 6 prochains mois ?\n3. Quel est votre principal frein aujourd''hui ?\n4. Avez-vous déjà mis en place des solutions ?\n5. Qui d''autre est impliqué dans ce type de décision ?\n\n## Récapitulatif et projection (4 minutes)\n\nSi je résume, vous cherchez à [reformulation du besoin].\n\n## Prochaine étape (2 minutes)\n\nCe que je vous propose, c''est qu''on se retrouve 45 minutes la semaine prochaine.',
   true, NOW() - INTERVAL '20 days'),

  (gen_random_uuid(),
   'Relance post-démo en 4 étapes',
   'Relance', 'Généraliste', 'email',
   E'## J+1 — Email récapitulatif\n\nObjet : Récap de notre échange + prochaine étape\n\nMerci pour notre échange d''hier. Voici un récapitulatif : ...\n\n## J+3 — Message LinkedIn\n\nJ''espère que vous avez pu jeter un œil au récapitulatif. Une question pertinente...\n\n## J+7 — Email de valeur\n\nObjet : [Ressource] qui devrait vous intéresser\n\nJe suis tombé sur [article/étude] qui fait écho à notre échange...\n\n## J+14 — Dernier message\n\nObjet : Je ferme le dossier ?\n\n1. On avance\n2. Plus tard\n3. Pas intéressé\n\nUn simple chiffre en réponse me suffit.',
   true, NOW() - INTERVAL '15 days'),

  (gen_random_uuid(),
   'Traitement des objections courantes',
   'Objections', 'Généraliste', 'telephone',
   E'## C''est trop cher\n\nJe comprends que l''investissement soit un critère important. Trop cher par rapport à quoi ?\nRecadrer sur la valeur et le ROI attendu.\n\n## Je dois réfléchir\n\nBien sûr. Pour que votre réflexion soit éclairée, qu''est-ce qui vous fait encore hésiter ?\n\n## On travaille déjà avec quelqu''un\n\nC''est une bonne chose. Qu''est-ce qui fonctionne bien ? S''il y avait une chose à améliorer ?\n\n## Envoyez-moi un email\n\nAvec plaisir. Pour qu''il soit pertinent, quel est votre principal enjeu sur [sujet] ?\n\n## Ce n''est pas le bon moment\n\nÀ quel horizon ce sujet redeviendra prioritaire ? D''ici là, une ressource utile ?',
   true, NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- 5. marketplace_listings (3 rows)
-- Columns: id, entrepreneur_id, title, description, niche, commission_type, commission_value, requirements, is_active
-- ---------------------------------------------------------------------------
INSERT INTO marketplace_listings (id, entrepreneur_id, title, description, niche, commission_type, commission_value, requirements, is_active, created_at)
VALUES
  (gen_random_uuid(),
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844',
   'Audit de votre tunnel de vente',
   'Je réalise un audit complet de votre tunnel de vente (site web, pages de capture, séquences email, processus de closing). Livrable : rapport PDF de 15 pages avec recommandations actionnables.',
   'Consulting', 'fixed', 497,
   '{"experience_min": "1 an", "skills": ["closing", "copywriting"]}'::jsonb,
   true, NOW() - INTERVAL '12 days'),

  (gen_random_uuid(),
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844',
   'Pack 10 posts LinkedIn ghostwriting',
   'Rédaction de 10 posts LinkedIn optimisés pour la génération de leads. Chaque post avec accroche, corps, appel à l''action et 3 hashtags stratégiques.',
   'Création de contenu', 'fixed', 350,
   '{"experience_min": "6 mois", "skills": ["linkedin", "copywriting"]}'::jsonb,
   true, NOW() - INTERVAL '8 days'),

  (gen_random_uuid(),
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844',
   'Formation closing 1-to-1 (3 sessions)',
   'Programme de formation individuelle au closing en 3 sessions de 1h30 en visioconférence. Techniques de closing, mises en situation enregistrées avec débriefing.',
   'Formation', 'percentage', 15,
   '{"experience_min": "2 ans", "skills": ["closing", "négociation", "formation"]}'::jsonb,
   true, NOW() - INTERVAL '5 days')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- 6. automation_rules (3 rows)
-- Columns: id, name, type, trigger_conditions (jsonb), actions (jsonb), is_active, created_by
-- ---------------------------------------------------------------------------
INSERT INTO automation_rules (id, name, type, trigger_conditions, actions, is_active, created_by)
VALUES
  (gen_random_uuid(),
   'Séquence de nurturing — Nouveau lead',
   'nurturing',
   '{"event": "prospect.created", "status": "new", "source": ["linkedin", "instagram", "website"]}'::jsonb,
   '{"sequence": [{"day": 0, "action": "send_email", "template": "welcome_lead"}, {"day": 2, "action": "send_email", "template": "case_study"}, {"day": 5, "action": "send_linkedin_message", "template": "soft_touch"}, {"day": 7, "action": "send_email", "template": "cta_booking"}, {"day": 14, "action": "create_task", "template": "manual_followup"}]}'::jsonb,
   true, 'f40e1dc7-939c-4edb-a3bc-bae93c88f844'),

  (gen_random_uuid(),
   'Upsell automatique — Client actif',
   'upsell',
   '{"event": "deal.stage_changed", "new_stage": "won", "deal_value_min": 500}'::jsonb,
   '{"sequence": [{"day": 30, "action": "send_email", "template": "satisfaction_check"}, {"day": 45, "action": "send_email", "template": "upsell_offer"}, {"day": 60, "action": "create_task", "template": "upsell_call"}]}'::jsonb,
   true, 'f40e1dc7-939c-4edb-a3bc-bae93c88f844'),

  (gen_random_uuid(),
   'Placement automatique — Prospect qualifié',
   'placement',
   '{"event": "prospect.status_changed", "new_status": "interested", "score_min": 50}'::jsonb,
   '{"sequence": [{"day": 0, "action": "assign_to_closer", "criteria": "round_robin"}, {"day": 0, "action": "send_notification", "message": "Nouveau prospect qualifié assigné"}, {"day": 0, "action": "create_task", "template": "first_call", "priority": "high"}]}'::jsonb,
   true, 'f40e1dc7-939c-4edb-a3bc-bae93c88f844')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- 7. deals (4 rows) — using stage_id references to pipeline_stages
-- ---------------------------------------------------------------------------
INSERT INTO deals (id, title, value, stage_id, assigned_to, source, temperature, notes, created_at)
VALUES
  (gen_random_uuid(),
   'Accompagnement commercial TechVision',
   4500.00,
   'd13e80d3-cbf8-4db5-b6d0-b6162c4c7577', -- Proposition
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844',
   'linkedin', 'chaud',
   'Claire Dubois — Directrice marketing. Proposition envoyée le 20/02. En attente de validation DG.',
   NOW() - INTERVAL '12 days'),

  (gen_random_uuid(),
   'Formation closing — Groupe Moreau Distribution',
   8900.00,
   'c858b4d8-960a-43eb-8aab-5b6c989da7d5', -- Contacté
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844',
   'salon', 'tiède',
   'Pierre-Antoine Moreau — DAF. Rencontré au salon. Premier call de qualification à planifier.',
   NOW() - INTERVAL '8 days'),

  (gen_random_uuid(),
   'Pack prospection LinkedIn — Émilie Rousseau',
   1200.00,
   'b8620c84-9a31-49fd-9895-196bdf1262eb', -- Closing
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844',
   'instagram', 'chaud',
   'Émilie Rousseau — Coach. En phase de closing. Dernière réunion prévue le 26/02.',
   NOW() - INTERVAL '5 days'),

  (gen_random_uuid(),
   'Audit tunnel de vente — Kermiche Immobilier',
   2500.00,
   'c731f4bb-22f6-4f7f-b5e0-afcc20e11180', -- Client Signé
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844',
   'referral', 'signé',
   'Nadia Kermiche — Agent immobilier. Contrat signé le 21/02. Démarrage audit le 03/03.',
   NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- 8. community_posts (3 rows)
-- Columns: id, author_id, content, type, title, likes_count
-- ---------------------------------------------------------------------------
INSERT INTO community_posts (id, author_id, content, type, title, likes_count, created_at)
VALUES
  (gen_random_uuid(),
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844',
   'Retour d''expérience : j''ai testé la technique du « mail de rupture » sur 30 prospects qui ne répondaient plus depuis 2 semaines. Résultat : 12 réponses en 48h, dont 4 qui ont booké un appel. Le secret ? Donner au prospect le contrôle total de la décision (3 options numérotées). Qui d''autre a testé cette approche ?',
   'post', 'Retour d''expérience : le mail de rupture', 24, NOW() - INTERVAL '6 days'),

  (gen_random_uuid(),
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844',
   'Astuce du jour : avant chaque appel de prospection, je passe 5 minutes à analyser le profil LinkedIn du prospect. Je cherche 3 choses : 1) un post récent sur lequel rebondir, 2) un point commun, 3) un signal d''affaires. Ça prend 5 min mais ça change tout sur le taux de réponse.',
   'post', 'Astuce : préparer ses appels de prospection', 18, NOW() - INTERVAL '3 days'),

  (gen_random_uuid(),
   'f40e1dc7-939c-4edb-a3bc-bae93c88f844',
   'Question pour la communauté : je suis en train de structurer un programme de formation pour des closers juniors. Si vous deviez retenir les 3 compétences les plus importantes à maîtriser en closing, ce serait lesquelles ?',
   'post', 'Question : top 3 compétences en closing ?', 31, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- 9. challenges (2 rows)
-- Columns: id, title, description, target_value, metric, points_reward, start_date, end_date, is_active, category, is_team
-- ---------------------------------------------------------------------------
INSERT INTO challenges (id, title, description, target_value, metric, points_reward, start_date, end_date, is_active, category, is_team)
VALUES
  (gen_random_uuid(),
   'Marathon de la prospection',
   'Défi individuel sur 7 jours : contactez un maximum de prospects qualifiés via LinkedIn et Instagram. Chaque message envoyé rapporte 5 points. Chaque réponse obtenue rapporte 15 points. Chaque RDV décroché rapporte 50 points.',
   50, 'messages_sent', 500,
   CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days',
   true, 'prospection', false),

  (gen_random_uuid(),
   'Challenge closing en équipe',
   'Formez des équipes de 3 et affrontez les autres groupes sur 2 semaines. L''objectif : obtenir le meilleur taux de closing sur les opportunités en cours. Bonus de 200 points pour l''équipe avec le cycle de vente le plus court.',
   20, 'deals_closed', 1000,
   CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '17 days',
   true, 'closing', true)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- Fin du seed v2
-- =============================================================================
