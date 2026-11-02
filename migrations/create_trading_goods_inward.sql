-- Create table for trading goods inward (purchased finished goods stock)
CREATE TABLE IF NOT EXISTS trading_goods_inward (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    inward_date DATE NOT NULL DEFAULT CURRENT_DATE,
    inward_number VARCHAR(50) NOT NULL,
    reference_no VARCHAR(100),
    supplier_id UUID REFERENCES supplier_master(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES finished_products(id) ON DELETE CASCADE,
    quantity NUMERIC(15, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'PCS',
    rate NUMERIC(15, 2) DEFAULT 0,
    gst_percent NUMERIC(5, 2) DEFAULT 0,
    gst_amount NUMERIC(15, 2) DEFAULT 0,
    total_amount NUMERIC(15, 2) DEFAULT 0,
    remarks TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trading_goods_company ON trading_goods_inward(company_id);
CREATE INDEX IF NOT EXISTS idx_trading_goods_product ON trading_goods_inward(product_id);
CREATE INDEX IF NOT EXISTS idx_trading_goods_date ON trading_goods_inward(inward_date);

-- Add permission key
INSERT INTO permissions (module_name, sub_module, permission_key, description)
VALUES ('Inventory', 'Trading Goods', 'inv_trading_view', 'Manage trading finished goods stock and inward')
ON CONFLICT DO NOTHING;

-- Disable RLS to allow backend operations
ALTER TABLE trading_goods_inward DISABLE ROW LEVEL SECURITY;

