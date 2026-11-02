-- migrations/add_hsn_and_round_off.sql
-- --------------------------------------------------------------
-- 1️⃣ Add HSN code column to purchase_entry_items table
-- --------------------------------------------------------------
ALTER TABLE purchase_entry_items 
    ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(100) DEFAULT NULL;

-- --------------------------------------------------------------
-- 2️⃣ Add round_off and is_round_off columns to purchase_entries table
-- --------------------------------------------------------------
ALTER TABLE purchase_entries 
    ADD COLUMN IF NOT EXISTS round_off NUMERIC(15, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_round_off BOOLEAN DEFAULT FALSE;
