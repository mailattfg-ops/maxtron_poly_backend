-- Migration: Add GST fields to customer orders and items
ALTER TABLE customer_orders
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_amount NUMERIC(15, 2) DEFAULT 0;

-- Correcting comment on customer_orders.total_value (Taxable value)
COMMENT ON COLUMN customer_orders.total_value IS 'Taxable Value (Before tax)';

-- Update customer_order_items
ALTER TABLE customer_order_items
    ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(15, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_value NUMERIC(15, 2) DEFAULT 0;

-- Drop 'value' if it's a generated column (risky, we might need to handle data migration)
-- But for now we just add the new ones.
