-- ============================================================
-- SALES SYSTEM — Phase 2 Seed Data
-- ============================================================

-- ===== CONTRACT TEMPLATES =====
INSERT INTO contract_templates (name, content) VALUES
(
  'Accompagnement Sales System — Standard',
  E'# CONTRAT D''ACCOMPAGNEMENT SALES SYSTEM — STANDARD\n\n**Entre :**\nSales System, représenté par Damien Reynaud\nci-après dénommé "Le Prestataire"\n\n**Et :**\n{{client_name}} ({{client_email}})\nci-après dénommé "Le Client"\n\n---\n\n## Article 1 — Objet du contrat\n\nLe Prestataire s''engage à fournir au Client un accompagnement commercial structuré comprenant :\n- Accès à la plateforme Sales System\n- Formation complète (modules vidéo + exercices)\n- 2 appels de coaching individuels par mois\n- Accès aux calls de groupe hebdomadaires\n- Accès à la communauté privée\n- Scripts de vente personnalisés\n\n## Article 2 — Offre\n\n**Offre :** {{offer_name}}\n**Montant total :** {{amount}} € TTC\n**Échéancier de paiement :** {{payment_schedule}}\n\n## Article 3 — Durée\n\nLe présent contrat prend effet à compter du {{start_date}} pour une durée de 3 mois renouvelable.\n\n## Article 4 — Obligations du Prestataire\n\nLe Prestataire s''engage à :\n- Mettre à disposition la plateforme et les ressources pédagogiques\n- Assurer les appels de coaching planifiés\n- Répondre aux questions dans un délai de 48h ouvrées\n- Fournir un suivi personnalisé via la plateforme\n\n## Article 5 — Obligations du Client\n\nLe Client s''engage à :\n- Régler les sommes dues selon l''échéancier convenu\n- Participer activement aux sessions de formation\n- Appliquer les méthodes et processus enseignés\n- Respecter la confidentialité des contenus\n\n## Article 6 — Résiliation\n\nChaque partie peut résilier le contrat avec un préavis de 30 jours par écrit. En cas de résiliation par le Client, les sommes déjà versées restent acquises.\n\n## Article 7 — Confidentialité\n\nLes parties s''engagent à garder confidentielles toutes les informations échangées dans le cadre de ce contrat.\n\n---\n\n**Fait à :** Paris\n**Le :** {{start_date}}\n\n**Signature du Prestataire :**\nDamien Reynaud — Sales System\n\n**Signature du Client :**\n{{client_name}}'
),
(
  'Accompagnement Sales System — Premium',
  E'# CONTRAT D''ACCOMPAGNEMENT SALES SYSTEM — PREMIUM\n\n**Entre :**\nSales System, représenté par Damien Reynaud\nci-après dénommé "Le Prestataire"\n\n**Et :**\n{{client_name}} ({{client_email}})\nci-après dénommé "Le Client"\n\n---\n\n## Article 1 — Objet du contrat\n\nLe Prestataire s''engage à fournir au Client un accompagnement commercial premium comprenant :\n- Accès illimité à la plateforme Sales System\n- Formation complète (tous les modules + bonus)\n- 4 appels de coaching individuels par mois\n- Accès prioritaire aux calls de groupe\n- Accès VIP à la communauté privée\n- Scripts de vente personnalisés et revus\n- Audit complet du processus de vente\n- Support prioritaire sous 24h\n- Accès aux masterclasses exclusives\n\n## Article 2 — Offre\n\n**Offre :** {{offer_name}}\n**Montant total :** {{amount}} € TTC\n**Échéancier de paiement :** {{payment_schedule}}\n\n## Article 3 — Durée\n\nLe présent contrat prend effet à compter du {{start_date}} pour une durée de 6 mois renouvelable.\n\n## Article 4 — Obligations du Prestataire\n\nLe Prestataire s''engage à :\n- Mettre à disposition la plateforme et toutes les ressources\n- Assurer les appels de coaching planifiés (4/mois)\n- Répondre aux questions dans un délai de 24h ouvrées\n- Fournir un suivi personnalisé et des rapports mensuels\n- Réaliser un audit initial du processus de vente du Client\n- Donner accès aux masterclasses exclusives\n\n## Article 5 — Obligations du Client\n\nLe Client s''engage à :\n- Régler les sommes dues selon l''échéancier convenu\n- Participer activement aux sessions de formation et coaching\n- Appliquer les méthodes et processus enseignés\n- Fournir les données nécessaires au suivi (KPIs)\n- Respecter la confidentialité des contenus\n\n## Article 6 — Garantie de résultat\n\nLe Prestataire s''engage à un accompagnement intensif. Si le Client n''atteint pas ses objectifs à mi-parcours, un plan d''action correctif sera mis en place avec des sessions supplémentaires offertes.\n\n## Article 7 — Résiliation\n\nChaque partie peut résilier le contrat avec un préavis de 30 jours par écrit. En cas de résiliation par le Client, les sommes déjà versées restent acquises.\n\n## Article 8 — Confidentialité\n\nLes parties s''engagent à garder confidentielles toutes les informations échangées dans le cadre de ce contrat.\n\n---\n\n**Fait à :** Paris\n**Le :** {{start_date}}\n\n**Signature du Prestataire :**\nDamien Reynaud — Sales System\n\n**Signature du Client :**\n{{client_name}}'
);

-- ===== ONBOARDING STEPS =====
INSERT INTO onboarding_steps (title, description, position, step_type, content, is_required) VALUES
(
  'Bienvenue',
  'Regardez la vidéo de bienvenue de Damien Reynaud.',
  1,
  'video',
  '{"video_url": "https://www.youtube.com/embed/placeholder", "duration": "5 min"}',
  true
),
(
  'Remplis ton questionnaire',
  'Aidez-nous à mieux vous connaître pour personnaliser votre accompagnement.',
  2,
  'questionnaire',
  '{"questions": [{"key": "niche", "label": "Quelle est votre niche ?", "type": "text"}, {"key": "current_offer", "label": "Quelle est votre offre actuelle ?", "type": "text"}, {"key": "monthly_revenue", "label": "Quel est votre CA mensuel actuel ?", "type": "select", "options": ["0 - 2 000 €", "2 000 - 5 000 €", "5 000 - 10 000 €", "10 000 - 25 000 €", "25 000 € +"]}, {"key": "goals_90d", "label": "Quels sont vos objectifs à 90 jours ?", "type": "textarea"}, {"key": "tools", "label": "Quels outils utilisez-vous actuellement ?", "type": "text"}, {"key": "biggest_problem", "label": "Quel est votre plus gros problème en acquisition ?", "type": "textarea"}]}',
  true
),
(
  'Accède à ta formation',
  'Commencez votre parcours de formation dans l''Academy.',
  3,
  'action',
  '{"action_url": "/academy", "action_label": "Aller à l''Academy"}',
  true
),
(
  'Planifie ton premier appel',
  'Réservez votre premier appel de coaching avec l''équipe.',
  4,
  'booking',
  '{"action_url": "/bookings", "action_label": "Réserver un créneau"}',
  true
);

-- ===== DEFAULT CHALLENGES =====
INSERT INTO challenges (title, description, target_value, metric, points_reward, start_date, end_date, is_active) VALUES
(
  'Book 5 appels cette semaine',
  'Bookez au moins 5 appels découverte cette semaine pour décrocher 50 points bonus.',
  5,
  'bookings_count',
  50,
  CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INT,
  CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INT + 6,
  true
),
(
  '100% de show-up cette semaine',
  'Ayez un taux de show-up parfait sur tous vos appels cette semaine.',
  100,
  'show_up_rate',
  75,
  CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INT,
  CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INT + 6,
  true
),
(
  'Close 2 deals ce mois',
  'Signez au moins 2 contrats ce mois-ci pour un bonus de 100 points.',
  2,
  'closing_rate',
  100,
  DATE_TRUNC('month', CURRENT_DATE)::DATE,
  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE,
  true
);

-- ===== RLS POLICIES FOR NEW FEATURES =====

-- Contract templates: admin/manager can manage, authenticated can view
CREATE POLICY "Authenticated can view contract templates" ON contract_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager can manage contract templates" ON contract_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Onboarding steps: anyone can view
CREATE POLICY "Authenticated can view onboarding steps" ON onboarding_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage onboarding steps" ON onboarding_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Client onboarding: client can manage own, admin can view all
CREATE POLICY "Client can manage own onboarding" ON client_onboarding FOR ALL USING (client_id = auth.uid());
CREATE POLICY "Admin can view all onboarding" ON client_onboarding FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Client can update own contracts (for signing)
CREATE POLICY "Client can update own contracts" ON contracts FOR UPDATE USING (client_id = auth.uid());

-- Notifications: system can insert
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- NPS surveys
CREATE POLICY "Admin can view all NPS" ON nps_surveys FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "Client can manage own NPS" ON nps_surveys FOR ALL USING (client_id = auth.uid());

-- Testimonials
CREATE POLICY "Authenticated can view approved testimonials" ON testimonials FOR SELECT TO authenticated USING (status = 'published' OR client_id = auth.uid());
CREATE POLICY "Client can create testimonials" ON testimonials FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid());
CREATE POLICY "Admin can manage testimonials" ON testimonials FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Gamification: authenticated can view for leaderboard, user can update own
CREATE POLICY "System can insert gamification profiles" ON gamification_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own gamification" ON gamification_profiles FOR UPDATE USING (user_id = auth.uid());

-- Challenge progress: authenticated can view for leaderboard
CREATE POLICY "Authenticated can view challenge progress" ON challenge_progress FOR SELECT TO authenticated USING (true);

-- Booking slots: authenticated can view
CREATE POLICY "Authenticated can view booking slots" ON booking_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own slots" ON booking_slots FOR ALL USING (user_id = auth.uid());

-- Deal activities: follow deal access
CREATE POLICY "Authenticated can view deal activities" ON deal_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert deal activities" ON deal_activities FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Group call attendance
CREATE POLICY "Authenticated can view attendance" ON group_call_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own attendance" ON group_call_attendance FOR ALL USING (user_id = auth.uid());

-- Client KPIs: admin can insert/update
CREATE POLICY "Admin can manage all kpis" ON client_kpis FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Supabase Storage bucket for contracts
-- Run in Supabase Dashboard > Storage > New bucket: "contracts" (public: false)
