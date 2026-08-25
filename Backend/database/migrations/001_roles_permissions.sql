-- =========================================================
-- Migration 001: Role-based access control (roles / permissions)
--
-- HOW TO RUN: import this file in phpMyAdmin (or `mysql aimsisters_db <
-- 001_roles_permissions.sql`) against a database that already has
-- schema.sql applied. Safe to run once; re-running is harmless for the
-- CREATE TABLE / INSERT IGNORE / ON DUPLICATE KEY statements, but the
-- ALTER TABLE ADD COLUMN statements will error on a second run (that's
-- expected — it means this migration already applied).
--
-- WHAT THIS DOES
-- Spec section 28 calls for configurable role permissions enforced by the
-- backend, not just hidden buttons. Previously `users.role` was a fixed
-- ENUM('visitor','admin','superadmin') checked with in_array() in PHP —
-- adding a role meant a code change + ALTER TABLE. This migration adds:
--   - roles              the assignable account roles
--   - permissions        each distinct capability the API can gate
--   - role_permissions   which roles have which permissions (editable via
--                        SQL or a future admin UI — no code change needed
--                        to regrant/revoke a permission from a role)
--   - users.role_id      FK to roles, replacing the enum going forward
--
-- "Visitor" from the spec's role list is intentionally NOT a row in
-- `roles` — it's any unauthenticated request (no JWT), which the API
-- already models as `optional_auth() === null`. Every *account* gets one
-- of the five roles below; visitors are simply everyone else.
--
-- DATA SAFETY: the old `users.role` ENUM column is left in place
-- (unused by new code, kept for rollback/audit) rather than dropped.
-- Existing rows are backfilled into role_id automatically below — no
-- existing user, session, or password is touched.
-- =========================================================

USE aimsisters_db;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Seed the five assignable roles.
-- ---------------------------------------------------------
INSERT INTO roles (slug, name, description) VALUES
  ('user',       'User',        'Registered member: can comment, save/bookmark content, and manage their own orders.'),
  ('moderator',  'Moderator',   'Trusted community member who can moderate comments.'),
  ('editor',     'Editor',      'Ministry staff who can create, edit, and publish content.'),
  ('admin',      'Admin',       'Full content and store management, including users and settings review.'),
  ('superadmin', 'Super Admin', 'Unrestricted access, including user role management and site settings.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ---------------------------------------------------------
-- Seed permissions. Grouped by the resource they gate; add more here as
-- new controllers are built (e.g. series.manage, quizzes.manage) —
-- INSERT ... ON DUPLICATE KEY UPDATE makes re-seeding safe.
-- ---------------------------------------------------------
INSERT INTO permissions (slug, name, description) VALUES
  ('content.create',        'Create content',            'Create draft ministry content (videos, articles, devotions, etc.).'),
  ('content.edit',          'Edit content',               'Edit any content item, including items authored by others.'),
  ('content.publish',       'Publish content',            'Change content status to published/scheduled/archived.'),
  ('content.delete',        'Delete content',             'Permanently remove content.'),
  ('content.feature',       'Feature content',            'Toggle homepage/library featured placement.'),
  ('categories.manage',     'Manage categories',          'Create, rename, or remove content/product categories.'),
  ('comments.moderate',     'Moderate comments',          'Approve, mark spam, or restore comments from any user.'),
  ('comments.delete_any',   'Delete any comment',         'Delete a comment authored by someone else.'),
  ('products.manage',       'Manage shop products',       'Create, edit, delete, and publish shop products.'),
  ('orders.manage',         'Manage all orders',          'View and update the status of any customer order.'),
  ('orders.view_own',       'View own orders',            'View order history for the signed-in account.'),
  ('uploads.create',        'Upload media',               'Upload images, video, audio, or PDF files.'),
  ('users.view',            'View user accounts',         'List and view other user accounts.'),
  ('users.manage',          'Manage user accounts',       'Suspend accounts and change account roles.'),
  ('testimonials.manage',   'Manage testimonials',        'Approve, edit, or remove testimonials.'),
  ('newsletter.manage',     'Manage newsletter',          'View and export the subscriber list.'),
  ('notifications.manage_own', 'Manage own notifications','Read/mark-read the signed-in account''s notifications.'),
  ('settings.manage',       'Manage site settings',       'Edit global site configuration key/value settings.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ---------------------------------------------------------
-- Default role -> permission grants. Each role includes everything the
-- role "below" it has (moderator gets user's grants too, etc.) except
-- superadmin, whose middleware check always passes regardless of this
-- table (see Backend/helpers/permissions.php) — its rows here exist only
-- so it also reads correctly in an admin "role permissions" screen later.
-- ---------------------------------------------------------
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.slug IN (
  'orders.view_own', 'notifications.manage_own'
) WHERE r.slug = 'user';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.slug IN (
  'orders.view_own', 'notifications.manage_own',
  'comments.moderate', 'comments.delete_any'
) WHERE r.slug = 'moderator';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.slug IN (
  'orders.view_own', 'notifications.manage_own',
  'comments.moderate', 'comments.delete_any',
  'content.create', 'content.edit', 'content.publish', 'content.feature',
  'categories.manage', 'uploads.create'
) WHERE r.slug = 'editor';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.slug IN (
  'orders.view_own', 'notifications.manage_own',
  'comments.moderate', 'comments.delete_any',
  'content.create', 'content.edit', 'content.publish', 'content.feature', 'content.delete',
  'categories.manage', 'uploads.create',
  'products.manage', 'orders.manage', 'users.view', 'testimonials.manage', 'newsletter.manage'
) WHERE r.slug = 'admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON 1=1
WHERE r.slug = 'superadmin';

-- ---------------------------------------------------------
-- users.role_id: add the FK column and backfill it from the existing
-- `role` enum. The enum column is left in place, unused, for rollback.
-- ---------------------------------------------------------
ALTER TABLE users
  ADD COLUMN role_id INT UNSIGNED DEFAULT NULL AFTER role,
  ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

UPDATE users u JOIN roles r ON r.slug = 'user'       SET u.role_id = r.id WHERE u.role = 'visitor'   AND u.role_id IS NULL;
UPDATE users u JOIN roles r ON r.slug = 'admin'      SET u.role_id = r.id WHERE u.role = 'admin'     AND u.role_id IS NULL;
UPDATE users u JOIN roles r ON r.slug = 'superadmin' SET u.role_id = r.id WHERE u.role = 'superadmin' AND u.role_id IS NULL;

CREATE INDEX idx_users_role_id ON users (role_id);

SET FOREIGN_KEY_CHECKS = 1;
