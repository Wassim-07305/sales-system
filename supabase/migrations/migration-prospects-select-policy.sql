-- Migration: Ajouter la policy SELECT manquante sur la table prospects
-- Sans cette policy, les appels .insert().select() et .select() échouent avec 42501 (RLS)
-- À exécuter dans le SQL Editor du Supabase Dashboard

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'prospects_select' AND tablename = 'prospects') THEN
    CREATE POLICY "prospects_select" ON prospects FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','setter','closer')));
  END IF;
END $$;
