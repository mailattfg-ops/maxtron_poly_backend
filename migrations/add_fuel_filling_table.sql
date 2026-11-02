-- Create fuel filling table
CREATE TABLE IF NOT EXISTS public.keil_fuel_filling (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    vehicle_id UUID REFERENCES public.keil_vehicles(id) ON DELETE CASCADE,
    indent_number TEXT,
    liters DECIMAL(12, 2) DEFAULT 0,
    rate DECIMAL(12, 2) DEFAULT 0,
    amount DECIMAL(12, 2) DEFAULT 0,
    efficiency DECIMAL(12, 2) DEFAULT 0, -- EQ
    difference DECIMAL(12, 2) DEFAULT 0, -- DIFF
    remarks TEXT
);

-- Enable RLS
ALTER TABLE public.keil_fuel_filling ENABLE ROW LEVEL SECURITY;

-- Create policy for select
CREATE POLICY "Allow all on fuel_filling" ON public.keil_fuel_filling
    FOR ALL USING (true);
