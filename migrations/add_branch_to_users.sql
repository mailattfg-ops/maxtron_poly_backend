-- Migration: Add branch assignment to employees (users table)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS branch_id UUID;

-- Add check for referential integrity if the keil_branches table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'keil_branches'
    ) THEN
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE constraint_name = 'users_branch_id_fkey'
        ) THEN
            ALTER TABLE users
                ADD CONSTRAINT users_branch_id_fkey
                FOREIGN KEY (branch_id) REFERENCES keil_branches(id);
        END IF;
    END IF;
END $$;

COMMENT ON COLUMN users.branch_id IS 'Assigned operational branch for the employee (Keil tenant)';
