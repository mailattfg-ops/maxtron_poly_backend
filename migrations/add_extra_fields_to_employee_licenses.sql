-- Migration: Add extra fields to employee_licenses table
ALTER TABLE employee_licenses
    ADD COLUMN IF NOT EXISTS license_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS expiry_date DATE,
    ADD COLUMN IF NOT EXISTS class_of_vehicle VARCHAR(100);

COMMENT ON COLUMN employee_licenses.license_number IS 'Unique identification number for the license (DL, Permit, etc.)';
COMMENT ON COLUMN employee_licenses.expiry_date IS 'Expiration date of the license/permit';
COMMENT ON COLUMN employee_licenses.class_of_vehicle IS 'Kerala DL vehicle class or permit category (e.g., LMV, MCWG, HPMV)';
