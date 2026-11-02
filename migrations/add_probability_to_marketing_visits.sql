-- Migration: Add probability field to marketing_visits table
ALTER TABLE marketing_visits
    ADD COLUMN IF NOT EXISTS probability VARCHAR(20) DEFAULT NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
