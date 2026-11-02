-- migrations/add_opening_stock.sql

-- Add opening_stock column to raw_materials table
ALTER TABLE raw_materials 
ADD COLUMN IF NOT EXISTS opening_stock NUMERIC(15, 2) DEFAULT 0;

-- Add opening_stock column to finished_products table
ALTER TABLE finished_products 
ADD COLUMN IF NOT EXISTS opening_stock NUMERIC(15, 2) DEFAULT 0;
