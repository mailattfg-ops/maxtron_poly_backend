-- Add Starting and Ending Time to Vehicle Logs
ALTER TABLE keil_vehicle_logs ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE keil_vehicle_logs ADD COLUMN IF NOT EXISTS end_time TIME;
