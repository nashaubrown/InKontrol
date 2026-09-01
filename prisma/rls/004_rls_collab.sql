-- RLS for Phase 1.3 collaboration tables. Same policy shape as 001; idempotent.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Comment','ActivityLogEntry','Attachment','Doc'] LOOP
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
