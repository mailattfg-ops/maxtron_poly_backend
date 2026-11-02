-- migrations/add_repair_driver_fk.sql
-- --------------------------------------------------------------
-- Add foreign key constraint from keil_vehicle_repairs.driver_id to users.id
-- --------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_name = 'keil_vehicle_repairs_driver_id_fkey'
          AND tc.table_name = 'keil_vehicle_repairs'
          AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE keil_vehicle_repairs
            ADD CONSTRAINT keil_vehicle_repairs_driver_id_fkey
            FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
