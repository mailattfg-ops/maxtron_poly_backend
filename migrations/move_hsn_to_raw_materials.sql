-- migrations/move_hsn_to_raw_materials.sql
-- --------------------------------------------------------------
-- 1️⃣ Add HSN Code column to raw_materials table
-- --------------------------------------------------------------
ALTER TABLE raw_materials 
    ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(100) DEFAULT NULL;

-- --------------------------------------------------------------
-- 2️⃣ Drop HSN Code column from purchase_entry_items table
-- --------------------------------------------------------------
ALTER TABLE purchase_entry_items 
    DROP COLUMN IF EXISTS hsn_code;
