-- Migration: payroll fields for the KEIL salary front sheet
-- ("FRONT SHEET SALARY KEIL <MON> <YEAR>": DRIVERS / PICKERS sections with
-- SL NO | NAME | DESIGNATION | DUTY | SALARY | ADVANCE | PENALTY | TOTAL | contractor).
--
-- * advance / penalty: the sheet keeps them apart; deductions stays their sum.
-- * designation: DRIVER, PICKER, ... as written on the sheet.
-- * Spare drivers are paid through a contractor and are not in Employee
--   Management, so their payroll row has no employee: employee_id becomes
--   optional and worker_name carries their name. Every row still has one or
--   the other.
--
-- Additive and safe to re-run.

ALTER TABLE employee_payroll ADD COLUMN IF NOT EXISTS advance NUMERIC DEFAULT 0;
ALTER TABLE employee_payroll ADD COLUMN IF NOT EXISTS penalty NUMERIC DEFAULT 0;
ALTER TABLE employee_payroll ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE employee_payroll ADD COLUMN IF NOT EXISTS worker_name TEXT;

ALTER TABLE employee_payroll ALTER COLUMN employee_id DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_payroll_employee_or_worker') THEN
        ALTER TABLE employee_payroll
            ADD CONSTRAINT employee_payroll_employee_or_worker
            CHECK (employee_id IS NOT NULL OR NULLIF(TRIM(worker_name), '') IS NOT NULL);
    END IF;
END $$;

-- One row per spare driver per company and month, as there is one per employee.
CREATE UNIQUE INDEX IF NOT EXISTS employee_payroll_worker_month_key
    ON employee_payroll (company_id, month, year, UPPER(TRIM(worker_name)))
    WHERE employee_id IS NULL;

NOTIFY pgrst, 'reload schema';
