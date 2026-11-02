-- Migration: Rename department to contact_person in customers table
ALTER TABLE customers 
    RENAME COLUMN department TO contact_person;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
