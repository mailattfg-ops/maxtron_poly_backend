-- Migration: Add requires_printing to production_batches
ALTER TABLE production_batches
    ADD COLUMN IF NOT EXISTS requires_printing BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN production_batches.requires_printing IS 'Controls if the batch must go through Printing module before Cutting & Sealing';
