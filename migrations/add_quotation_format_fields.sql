-- Migration: quotation header fields for the client's two quotation formats
-- (Trading and Bags, exported to Excel).
--
--   quotation_type    'TRADING' | 'BAGS' — which layout the quotation prints in
--   quotation_ref     the client's own reference, e.g. MA/TSR-01420/26-27
--   quotation_subject the "Sub:" line of a bags quotation
--
-- Per-item fields (bags_per_kg, image) live inside the existing quotation_items
-- JSONB and need no column. Additive and nullable; safe to re-run.
-- Same as: npm run alter-quotation-format

ALTER TABLE marketing_visits ADD COLUMN IF NOT EXISTS quotation_type VARCHAR(20);
ALTER TABLE marketing_visits ADD COLUMN IF NOT EXISTS quotation_ref VARCHAR(100);
ALTER TABLE marketing_visits ADD COLUMN IF NOT EXISTS quotation_subject TEXT;

NOTIFY pgrst, 'reload schema';
