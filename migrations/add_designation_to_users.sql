-- Migration: Add designation field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation TEXT;
