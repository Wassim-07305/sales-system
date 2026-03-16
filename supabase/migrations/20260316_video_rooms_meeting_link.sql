-- Ajouter le champ meeting_link à la table video_rooms
-- pour stocker le lien Google Meet (ou autre) de chaque visioconférence
ALTER TABLE video_rooms ADD COLUMN IF NOT EXISTS meeting_link text;
