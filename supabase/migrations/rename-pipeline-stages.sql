-- Migration: Rename pipeline stages to match new naming convention
-- Run this against your Supabase DB to update existing stage names

UPDATE pipeline_stages SET name = 'Nouveau lead' WHERE name = 'Prospect';
UPDATE pipeline_stages SET name = 'Relancé' WHERE name = 'Appel Découverte' OR name = 'Appel Decouverte';
UPDATE pipeline_stages SET name = 'Call booké' WHERE name = 'Proposition';
UPDATE pipeline_stages SET name = 'Fermé (gagné)' WHERE name = 'Closing';
UPDATE pipeline_stages SET name = 'Fermé (perdu)', color = '#ef4444' WHERE name = 'Client Signé';
-- "Contacté" remains unchanged

-- Verify:
-- SELECT * FROM pipeline_stages ORDER BY position;
