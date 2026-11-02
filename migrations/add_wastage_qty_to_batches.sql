-- Migration: Add wastage_qty to production_batches
ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS wastage_qty NUMERIC(10, 2) DEFAULT 0;
NOTIFY pgrst, 'reload schema';
