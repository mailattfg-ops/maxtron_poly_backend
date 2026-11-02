-- Migration: Add section_type to customer orders
ALTER TABLE customer_orders
    ADD COLUMN IF NOT EXISTS section_type VARCHAR(50) DEFAULT 'customer order';

COMMENT ON COLUMN customer_orders.section_type IS '1: customer sample, 2: customer order';
