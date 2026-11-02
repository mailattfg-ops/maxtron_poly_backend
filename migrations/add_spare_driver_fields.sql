-- Migration: Add spare_driver_name to keil_vehicle_logs, keil_vehicle_repairs, and keil_collection_headers

ALTER TABLE keil_vehicle_logs 
    ADD COLUMN IF NOT EXISTS spare_driver_name VARCHAR(255) DEFAULT NULL;

ALTER TABLE keil_vehicle_repairs 
    ADD COLUMN IF NOT EXISTS spare_driver_name VARCHAR(255) DEFAULT NULL;

ALTER TABLE keil_collection_headers 
    ADD COLUMN IF NOT EXISTS spare_driver_name VARCHAR(255) DEFAULT NULL;

NOTIFY pgrst, 'reload schema';
