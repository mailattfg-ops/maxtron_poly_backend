-- Migration: Add date_of_joining and relieving_date to users, and no_of_duties to employee_payroll

ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS date_of_joining DATE DEFAULT NULL;

ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS relieving_date DATE DEFAULT NULL;

ALTER TABLE employee_payroll 
    ADD COLUMN IF NOT EXISTS no_of_duties NUMERIC DEFAULT 0;

NOTIFY pgrst, 'reload schema';
