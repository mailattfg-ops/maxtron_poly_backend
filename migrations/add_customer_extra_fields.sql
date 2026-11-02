-- Migration: Add extra fields to customers table
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS mobile_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS email_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS department VARCHAR(100),
    ADD COLUMN IF NOT EXISTS custom_label1 VARCHAR(100),
    ADD COLUMN IF NOT EXISTS custom_value1 TEXT,
    ADD COLUMN IF NOT EXISTS custom_label2 VARCHAR(100),
    ADD COLUMN IF NOT EXISTS custom_value2 TEXT;
