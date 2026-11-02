-- migrations/add_attendance_summary_permission.sql
-- --------------------------------------------------------------
-- Separate Attendance Details and Attendance Summary permissions
-- --------------------------------------------------------------

UPDATE permissions 
SET sub_module = 'Attendance Details' 
WHERE permission_key = 'hr_attendance_view';

INSERT INTO permissions (id, module_name, sub_module, permission_key, description)
VALUES (
    gen_random_uuid(),
    'HR',
    'Attendance Summary',
    'hr_attendance_summary_view',
    'View attendance summary reports'
)
ON CONFLICT (permission_key) DO UPDATE 
SET module_name = 'HR', sub_module = 'Attendance Summary';

INSERT INTO role_permissions (id, role_id, permission_key, can_view, can_create, can_edit, can_delete)
SELECT 
    gen_random_uuid(),
    role_id,
    'hr_attendance_summary_view',
    can_view,
    can_create,
    can_edit,
    can_delete
FROM role_permissions
WHERE permission_key = 'hr_attendance_view'
ON CONFLICT (role_id, permission_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
