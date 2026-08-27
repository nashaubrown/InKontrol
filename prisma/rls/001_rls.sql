-- InKontrol — Row-Level Security policies (second enforcement layer beneath the app's
-- org-scoped repository layer; see security brief §1).
--
-- Apply after `prisma migrate deploy` with:  psql "$DATABASE_URL" -f prisma/rls/001_rls.sql
--
-- The application sets the current tenant per transaction:
--   SET LOCAL app.current_org_id = '<organizationId>';
-- (done automatically by the withOrg() helper in src/lib/db.ts)
--
-- Note: connect as a non-superuser, non-table-owner role in production, or use
-- FORCE ROW LEVEL SECURITY as below so owners are also constrained.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Workspace','Space','Folder','List','Membership','Invite'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON %I
      USING ("organizationId" = current_setting('app.current_org_id', true))
      WITH CHECK ("organizationId" = current_setting('app.current_org_id', true))
    $p$, t);
  END LOOP;
END $$;
