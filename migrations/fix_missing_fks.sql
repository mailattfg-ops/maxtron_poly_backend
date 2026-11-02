-- migrations/fix_missing_fks.sql
-- --------------------------------------------------------------
-- 1️⃣  RM Orders → Supplier Master
-- --------------------------------------------------------------
-- Ensure the column exists
ALTER TABLE rm_orders
    ADD COLUMN IF NOT EXISTS supplier_id UUID;

-- Add the foreign‑key constraint (if it isn’t already there)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_name = 'rm_orders_supplier_id_fkey'
          AND tc.table_name = 'rm_orders'
          AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE rm_orders
            ADD CONSTRAINT rm_orders_supplier_id_fkey
            FOREIGN KEY (supplier_id) REFERENCES supplier_master(id);
    END IF;
END $$;

-- --------------------------------------------------------------
-- 2️⃣  Purchase Entries → Supplier Master
-- --------------------------------------------------------------
ALTER TABLE purchase_entries
    ADD COLUMN IF NOT EXISTS supplier_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_name = 'purchase_entries_supplier_id_fkey'
          AND tc.table_name = 'purchase_entries'
          AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE purchase_entries
            ADD CONSTRAINT purchase_entries_supplier_id_fkey
            FOREIGN KEY (supplier_id) REFERENCES supplier_master(id);
    END IF;
END $$;

-- --------------------------------------------------------------
-- 3️⃣  Material Consumptions → Raw Materials
-- --------------------------------------------------------------
ALTER TABLE material_consumptions
    ADD COLUMN IF NOT EXISTS rm_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_name = 'material_consumptions_rm_id_fkey'
          AND tc.table_name = 'material_consumptions'
          AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE material_consumptions
            ADD CONSTRAINT material_consumptions_rm_id_fkey
            FOREIGN KEY (rm_id) REFERENCES raw_materials(id);
    END IF;
END $$;
