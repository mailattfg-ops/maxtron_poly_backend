-- Migration: Add extra fields to production conversion items
ALTER TABLE production_conversion_items
    ADD COLUMN IF NOT EXISTS bags_per_kg NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS micron_size VARCHAR(50);

COMMENT ON COLUMN production_conversion_items.bags_per_kg IS 'Number of bags per kilogram';
COMMENT ON COLUMN production_conversion_items.micron_size IS 'Micron size specification of the produced bags';
