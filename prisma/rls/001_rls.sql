-- InKontrol — Row-Level Security policies (second enforcement layer beneath the app's
-- org-scoped repository layer; see security brief §1). Idempotent; applied
-- automatically at build time by scripts/migrate-if-db.mjs via `prisma db execute`.
--
-- The application sets the current tenant per transaction (withOrg() in src/lib/db.ts):
--   SELECT set_config('app.current_org_id', '<organizationId>', true);
--
-- Policy shape: when a tenant is set for the transaction, rows are restricted to that
-- tenant (Postgres refuses cross-tenant reads/writes even if app code has a bug).
-- When no tenant is set (auth bootstrap: membership lookup at login, invite acceptance),
-- the query is allowed and application-layer scoping is the guard. This fallback is
-- required because managed Postgres (Neon/Supabase) connects as the table owner.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Workspace','Space','Folder','List','Membership','Invite'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON %I
      USING (
        current_setting('app.current_org_id', true) IS NULL
        OR current_setting('app.current_org_id', true) = ''
        OR "organizationId" = current_setting('app.current_org_id', true)
      )
      WITH CHECK (
        current_setting('app.current_org_id', true) IS NULL
        OR current_setting('app.current_org_id', true) = ''
        OR "organizationId" = current_setting('app.current_org_id', true)
      )
    $p$, t);
  END LOOP;
END $$;
