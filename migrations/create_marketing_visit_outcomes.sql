-- Migration: Create marketing_visit_outcomes table for configurable Visit Outcomes
CREATE TABLE IF NOT EXISTS marketing_visit_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  name VARCHAR(150) NOT NULL,
  color VARCHAR(50),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_outcomes_name_company 
ON marketing_visit_outcomes (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

ALTER TABLE marketing_visit_outcomes DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE marketing_visit_outcomes TO anon, authenticated, service_role;
