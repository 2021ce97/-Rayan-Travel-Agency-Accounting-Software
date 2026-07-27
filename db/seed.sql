-- Seed initial data for Rayan Solutions
BEGIN;

-- Create default roles
INSERT INTO roles (agency_id, name, description, permissions)
VALUES (1, 'owner', 'Agency owner with full access', '{"all": true}')
ON CONFLICT DO NOTHING;

-- Create admin user (password: admin123)
-- password_hash is bcrypt of 'admin123'
INSERT INTO users (agency_id, role_id, name, email, password_hash, status)
VALUES (
  1,
  1,
  'Admin User',
  'admin@rayan.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'active'
)
ON CONFLICT DO NOTHING;

COMMIT;
