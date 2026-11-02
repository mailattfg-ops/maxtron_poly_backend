-- Add Odometer Reading to Fuel Filling
ALTER TABLE public.keil_fuel_filling 
    ADD COLUMN IF NOT EXISTS odometer_reading DECIMAL(12, 2) DEFAULT NULL;

NOTIFY pgrst, 'reload schema';
