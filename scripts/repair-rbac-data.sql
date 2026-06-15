-- RBAC data repair diagnostics and manual repair steps
-- Run against the target database before/after upgrading RBAC schema.

-- 1) List all users and role_id values
SELECT id, email, full_name, role_id, is_active
FROM users
ORDER BY id;

-- 2) List all roles
SELECT id, name, label, is_system
FROM roles
ORDER BY id;

-- 3) Verify role counts
SELECT
  (SELECT COUNT(*) FROM users) AS user_count,
  (SELECT COUNT(*) FROM roles) AS role_count,
  (SELECT COUNT(*) FROM permissions) AS permission_count;

-- 4) Find orphaned role references
SELECT u.id, u.email, u.role_id
FROM users u
LEFT JOIN roles r ON r.id = u.role_id
WHERE r.id IS NULL;

-- 5) Verify seeded role mappings (expected after repair)
SELECT u.email, u.role_id, r.name AS role_name
FROM users u
LEFT JOIN roles r ON r.id = u.role_id
WHERE u.email IN ('admin@ems.local', 'superadmin@ems.online');

-- Manual repair (only if application bootstrap cannot run yet):
-- Step A: ensure roles exist (super/admin/viewer) via application startup
-- Step B: map known users once roles exist
-- UPDATE users u
-- JOIN roles r ON r.name = 'admin'
-- SET u.role_id = r.id
-- WHERE u.email = 'admin@ems.local';
--
-- UPDATE users u
-- JOIN roles r ON r.name = 'super'
-- SET u.role_id = r.id
-- WHERE u.email = 'superadmin@ems.online';
--
-- Step C: add FK after all users.role_id values are valid
-- ALTER TABLE users
-- ADD CONSTRAINT FK_users_role_id
-- FOREIGN KEY (role_id) REFERENCES roles(id)
-- ON DELETE RESTRICT ON UPDATE CASCADE;
