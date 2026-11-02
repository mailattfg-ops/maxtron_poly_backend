-- Add category to finished_products table ('PRODUCT' | 'TRADING')
ALTER TABLE finished_products ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'PRODUCT';

-- Update existing trading goods products
UPDATE finished_products 
SET category = 'TRADING' 
WHERE product_name ILIKE '%bin%' 
   OR product_name ILIKE '%pedal%' 
   OR product_name ILIKE '%bucket%' 
   OR product_code ILIKE '%TRD%'
   OR product_code IN ('FP-000008', 'FP-000009');

-- Ensure all other products default to PRODUCT
UPDATE finished_products 
SET category = 'PRODUCT' 
WHERE category IS NULL;

NOTIFY pgrst, 'reload schema';
