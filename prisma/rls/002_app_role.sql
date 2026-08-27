-- Create the non-superuser role the application must connect as for RLS to apply
-- (superusers and table owners without FORCE bypass RLS entirely).
-- Set a real password and use this role in DATABASE_URL in production.
--
--   psql "$ADMIN_DATABASE_URL" -f prisma/rls/002_app_role.sql

CREATE ROLE app_user LOGIN PASSWORD 'change-me';
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
