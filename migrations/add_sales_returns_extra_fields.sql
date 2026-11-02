-- Migration: Add extra fields and foreign key to sales_returns
ALTER TABLE sales_returns
    ADD COLUMN IF NOT EXISTS return_through VARCHAR(20) DEFAULT 'DIRECT',
    ADD COLUMN IF NOT EXISTS courier_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS return_employee_id UUID;

-- Add foreign key for return_employee_id
ALTER TABLE sales_returns
    ADD CONSTRAINT IF NOT EXISTS sales_returns_return_employee_id_fkey
    FOREIGN KEY (return_employee_id) REFERENCES users(id);
