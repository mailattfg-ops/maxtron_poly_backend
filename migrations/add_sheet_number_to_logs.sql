-- Add Sheet Number to Vehicle Logs (Tripsheet manual entry)
ALTER TABLE keil_vehicle_logs ADD COLUMN IF NOT EXISTS sheet_number VARCHAR(100) DEFAULT NULL;
