-- Add GST Bill, On Route, and Workshop Contact Number to Vehicle Repairs
ALTER TABLE keil_vehicle_repairs 
    ADD COLUMN IF NOT EXISTS is_gst_bill BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_on_route BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS workshop_contact_number VARCHAR(50) DEFAULT NULL;

NOTIFY pgrst, 'reload schema';
