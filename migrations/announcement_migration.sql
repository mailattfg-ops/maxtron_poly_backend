-- Migration: Create Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'critical')),
    tenant TEXT NOT NULL CHECK (tenant IN ('maxtron', 'keil')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Index for faster filtering by tenant and active status
CREATE INDEX idx_announcements_tenant_active ON announcements(tenant, active);

-- Comment explaining the table
COMMENT ON TABLE announcements IS 'Stores tenant-specific dashboard announcements created by admins.';
