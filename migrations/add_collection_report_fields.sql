-- Add Category to HCE
ALTER TABLE keil_hces ADD COLUMN IF NOT EXISTS hce_category TEXT DEFAULT 'Others';

-- Add Operational Metrics to Collection Headers
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS km_run NUMERIC DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS collection_qty NUMERIC DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS dc_qty INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS nw_qty INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS rd_qty INTEGER DEFAULT 0;

-- Breakdown columns
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS assigned_bedded INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS assigned_others INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS visited_bedded INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS visited_others INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS missed_bedded INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS missed_others INTEGER DEFAULT 0;
