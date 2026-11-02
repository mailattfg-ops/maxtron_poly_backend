-- migrations/add_fuel_permission.sql
-- --------------------------------------------------------------
-- Separate Tripsheet (fleet_log_view) and Fuel Filling (fleet_fuel_view) permissions
-- --------------------------------------------------------------

UPDATE permissions 
SET sub_module = 'Tripsheet' 
WHERE permission_key = 'fleet_log_view';

INSERT INTO permissions (id, module_name, sub_module, permission_key, description)
VALUES (
    gen_random_uuid(),
    'Fleet',
    'Fuel Filling',
    'fleet_fuel_view',
    'Track fuel consumption and telemetry'
)
ON CONFLICT (permission_key) DO UPDATE 
SET module_name = 'Fleet', sub_module = 'Fuel Filling';

INSERT INTO role_permissions (id, role_id, permission_key, can_view, can_create, can_edit, can_delete)
SELECT 
    gen_random_uuid(),
    role_id,
    'fleet_fuel_view',
    can_view,
    can_create,
    can_edit,
    can_delete
FROM role_permissions
WHERE permission_key = 'fleet_log_view'
ON CONFLICT (role_id, permission_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
