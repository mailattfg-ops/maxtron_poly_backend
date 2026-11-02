-- Add Running Status to Vehicle Logs
ALTER TABLE keil_vehicle_logs ADD COLUMN IF NOT EXISTS is_running BOOLEAN DEFAULT true;
