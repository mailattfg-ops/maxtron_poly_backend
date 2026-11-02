-- 1. Create the employee_insurances table
CREATE TABLE IF NOT EXISTS employee_insurances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    policy_number VARCHAR(100),
    provider VARCHAR(100),
    insurance_type VARCHAR(100), -- (e.g. Life, Medical, Accident)
    expiry_date DATE,
    premium_amount DECIMAL(15, 2) DEFAULT 0,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure the schema cache is reloaded
NOTIFY pgrst, 'reload schema';
