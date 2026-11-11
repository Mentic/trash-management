-- Sec. 4: chei străine auto-referențiale, protecții la nivel de bază de date, drepturi pentru app_rw.
ALTER TABLE "documents" ADD CONSTRAINT "documents_linked_document_id_fk"
  FOREIGN KEY ("linked_document_id") REFERENCES "documents"("id");
--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_proof_attachment_id_fk"
  FOREIGN KEY ("proof_attachment_id") REFERENCES "attachments"("id");
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
-- R08: căutare după obiect / corespondent / număr extern
CREATE INDEX "documents_search_trgm" ON "documents"
  USING gin ((lower(subject || ' ' || correspondent_name || ' ' || coalesce(external_ref, ''))) gin_trgm_ops);
--> statement-breakpoint
-- R02, N09: jurnalul doar se completează; anexele nu se modifică. Excepție: app_admin (resetarea demo).
CREATE OR REPLACE FUNCTION forbid_unless_admin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user <> 'app_admin' THEN
    RAISE EXCEPTION '% is append-only/immutable (%)', TG_TABLE_NAME, TG_OP;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
--> statement-breakpoint
CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION forbid_unless_admin();
--> statement-breakpoint
CREATE TRIGGER attachments_immutable BEFORE UPDATE OR DELETE ON "attachments"
  FOR EACH ROW EXECUTE FUNCTION forbid_unless_admin();
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    GRANT USAGE ON SCHEMA public TO app_rw;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rw;
    REVOKE UPDATE, DELETE, TRUNCATE ON "audit_events" FROM app_rw;
    REVOKE UPDATE, DELETE, TRUNCATE ON "attachments" FROM app_rw;
  END IF;
END $$;
