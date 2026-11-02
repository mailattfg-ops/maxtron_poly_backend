-- Migration: Add branch_ids array and is_all_branches flag to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS branch_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_all_branches BOOLEAN DEFAULT false;

-- Backfill existing users with assigned branch_id into branch_ids array
UPDATE users 
SET branch_ids = ARRAY[branch_id::text] 
WHERE branch_id IS NOT NULL 
  AND (branch_ids IS NULL OR array_length(branch_ids, 1) IS NULL OR array_length(branch_ids, 1) = 0);
