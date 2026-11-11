CREATE TYPE "public"."destination_type" AS ENUM('sorting', 'mbt', 'composting', 'recycling', 'other_recovery', 'landfill');--> statement-breakpoint
CREATE TYPE "public"."dispatch_channel" AS ENUM('email', 'post', 'courier', 'hand_delivery');--> statement-breakpoint
CREATE TYPE "public"."doc_direction" AS ENUM('incoming', 'outgoing', 'internal');--> statement-breakpoint
CREATE TYPE "public"."doc_status" AS ENUM('draft', 'registered', 'assigned', 'drafting', 'in_approval', 'approved', 'outgoing_registered', 'dispatched', 'filed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."intake_channel" AS ENUM('email', 'post', 'courier', 'hand_delivery', 'in_person');--> statement-breakpoint
CREATE TYPE "public"."request_type" AS ENUM('petition', 'public_info', 'institution_letter', 'operator_report', 'reply', 'internal', 'other');--> statement-breakpoint
CREATE TYPE "public"."uat_environment" AS ENUM('urban', 'rural');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('registrar', 'officer', 'director');--> statement-breakpoint
CREATE TYPE "public"."waste_fraction" AS ENUM('residual', 'paper_cardboard', 'plastic_metal', 'glass', 'biowaste', 'bulky', 'other');--> statement-breakpoint
CREATE TYPE "public"."waste_row_status" AS ENUM('imported', 'flagged', 'corrected', 'excluded', 'validated', 'approved');--> statement-breakpoint
CREATE TYPE "public"."waste_rule" AS ENUM('V1', 'V2', 'V3', 'V4', 'V5', 'V6');--> statement-breakpoint
CREATE TABLE "annual_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uat_id" uuid NOT NULL,
	"year" smallint NOT NULL,
	"approved_total_kg" bigint NOT NULL,
	"approved_by" uuid NOT NULL,
	"approved_at" timestamp with time zone NOT NULL,
	"reopened_by" uuid,
	"reopened_at" timestamp with time zone,
	"reopen_reason" text,
	CONSTRAINT "reopen_has_reason" CHECK (("annual_approvals"."reopened_at" IS NULL) = ("annual_approvals"."reopen_reason" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "annual_parameters" (
	"year" smallint PRIMARY KEY NOT NULL,
	"annex6_pct" numeric(5, 2) NOT NULL,
	"recycling_target_pct" numeric(5, 2) NOT NULL,
	"tolerance_kg" integer NOT NULL,
	"afm_rate_lei_per_t" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "archive_years" (
	"year" smallint PRIMARY KEY NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"approved_by" uuid
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"waste_row_id" uuid,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" char(64) NOT NULL,
	"storage_key" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachment_max_10mb" CHECK ("attachments"."size_bytes" <= 10485760),
	CONSTRAINT "attachment_one_owner" CHECK (num_nonnulls("attachments"."document_id", "attachments"."waste_row_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid,
	"category" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"old_values" jsonb,
	"new_values" jsonb,
	"reason" text,
	"ip" "inet"
);
--> statement-breakpoint
CREATE TABLE "dispatches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"channel" "dispatch_channel" NOT NULL,
	"dispatched_on" date NOT NULL,
	"proof_ref" text,
	"proof_attachment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dispatch_has_proof" CHECK ("dispatches"."proof_ref" IS NOT NULL OR "dispatches"."proof_attachment_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" smallint NOT NULL,
	"number" integer,
	"direction" "doc_direction" NOT NULL,
	"status" "doc_status" DEFAULT 'draft' NOT NULL,
	"registered_at" timestamp with time zone,
	"correspondent_name" text NOT NULL,
	"correspondent_address" text,
	"external_ref" text,
	"subject" text NOT NULL,
	"request_type" "request_type" NOT NULL,
	"intake_channel" "intake_channel",
	"deadline" date,
	"deadline_extension_days" smallint DEFAULT 0 NOT NULL,
	"redirected" boolean DEFAULT false NOT NULL,
	"assignee_id" uuid,
	"dossier_id" uuid,
	"filed_at" timestamp with time zone,
	"linked_document_id" uuid,
	"reply_draft" text,
	"cancel_reason" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "number_iff_registered" CHECK (("documents"."status" = 'draft') = ("documents"."number" IS NULL)),
	CONSTRAINT "filed_needs_dossier" CHECK ("documents"."status" <> 'filed' OR "documents"."dossier_id" IS NOT NULL),
	CONSTRAINT "cancel_needs_reason" CHECK ("documents"."status" <> 'cancelled' OR "documents"."cancel_reason" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "dossiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"retention" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "dossiers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"destination_type" "destination_type" NOT NULL,
	CONSTRAINT "facilities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "import_rejections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"rule" "waste_rule" NOT NULL,
	"ticket_no" text,
	"reasons" text[] NOT NULL,
	"raw" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"file_name" text NOT NULL,
	"sha256" char(64) NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_rows" integer NOT NULL,
	"rejected_rows" integer NOT NULL,
	"flagged_rows" integer NOT NULL,
	"clean_rows" integer NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "import_linked_to_document" CHECK ("imports"."is_seed" OR "imports"."document_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cui" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "operators_cui_unique" UNIQUE("cui")
);
--> statement-breakpoint
CREATE TABLE "recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registry_counters" (
	"year" smallint PRIMARY KEY NOT NULL,
	"last_number" integer NOT NULL,
	CONSTRAINT "last_number_non_negative" CHECK ("registry_counters"."last_number" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"pending_totp_secret_enc" "bytea",
	"last_seen_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "uats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siruta" text NOT NULL,
	"siruta_source" text DEFAULT 'demo' NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"environment" "uat_environment" NOT NULL,
	"population" integer NOT NULL,
	"organized_service" boolean NOT NULL,
	"contracted_qty_kg" integer NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "uats_siruta_unique" UNIQUE("siruta")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"password_hash" text NOT NULL,
	"totp_secret_enc" "bytea",
	"totp_key_version" smallint,
	"totp_enrolled_at" timestamp with time zone,
	"totp_last_step" bigint,
	"failed_mfa_count" smallint DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "waste_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"row_id" uuid NOT NULL,
	"rule" "waste_rule" NOT NULL,
	"details" jsonb NOT NULL,
	"duplicate_of" uuid,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"resolution_reason" text,
	CONSTRAINT "flag_rule" CHECK ("waste_flags"."rule" IN ('V2','V3','V4','V5'))
);
--> statement-breakpoint
CREATE TABLE "waste_row_route_uats" (
	"row_id" uuid NOT NULL,
	"uat_id" uuid NOT NULL,
	CONSTRAINT "waste_row_route_uats_row_id_uat_id_pk" PRIMARY KEY("row_id","uat_id")
);
--> statement-breakpoint
CREATE TABLE "waste_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"period" date NOT NULL,
	"year" smallint GENERATED ALWAYS AS (extract(year from period)::smallint) STORED,
	"weighed_at" timestamp with time zone NOT NULL,
	"ticket_no" varchar(30) NOT NULL,
	"vehicle_no" text NOT NULL,
	"operator_cui" text NOT NULL,
	"uat_id" uuid,
	"shared_route" boolean NOT NULL,
	"ler_code" char(8) NOT NULL,
	"fraction" "waste_fraction" NOT NULL,
	"destination_type" "destination_type" NOT NULL,
	"facility_id" uuid NOT NULL,
	"reported_kg" integer NOT NULL,
	"ticket_kg" integer,
	"supporting_doc" text,
	"status" "waste_row_status" NOT NULL,
	"status_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "period_first_day" CHECK (extract(day from "waste_rows"."period") = 1),
	CONSTRAINT "ler_format" CHECK ("waste_rows"."ler_code" ~ '^[0-9]{2} [0-9]{2} [0-9]{2}$'),
	CONSTRAINT "reported_positive" CHECK ("waste_rows"."reported_kg" > 0)
);
--> statement-breakpoint
ALTER TABLE "annual_approvals" ADD CONSTRAINT "annual_approvals_uat_id_uats_id_fk" FOREIGN KEY ("uat_id") REFERENCES "public"."uats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annual_approvals" ADD CONSTRAINT "annual_approvals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annual_approvals" ADD CONSTRAINT "annual_approvals_reopened_by_users_id_fk" FOREIGN KEY ("reopened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive_years" ADD CONSTRAINT "archive_years_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive_years" ADD CONSTRAINT "archive_years_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_waste_row_id_waste_rows_id_fk" FOREIGN KEY ("waste_row_id") REFERENCES "public"."waste_rows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rejections" ADD CONSTRAINT "import_rejections_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_flags" ADD CONSTRAINT "waste_flags_row_id_waste_rows_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."waste_rows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_flags" ADD CONSTRAINT "waste_flags_duplicate_of_waste_rows_id_fk" FOREIGN KEY ("duplicate_of") REFERENCES "public"."waste_rows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_flags" ADD CONSTRAINT "waste_flags_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_row_route_uats" ADD CONSTRAINT "waste_row_route_uats_row_id_waste_rows_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."waste_rows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_row_route_uats" ADD CONSTRAINT "waste_row_route_uats_uat_id_uats_id_fk" FOREIGN KEY ("uat_id") REFERENCES "public"."uats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_rows" ADD CONSTRAINT "waste_rows_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_rows" ADD CONSTRAINT "waste_rows_uat_id_uats_id_fk" FOREIGN KEY ("uat_id") REFERENCES "public"."uats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_rows" ADD CONSTRAINT "waste_rows_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "annual_approval_active" ON "annual_approvals" USING btree ("uat_id","year") WHERE "annual_approvals"."reopened_at" IS NULL;--> statement-breakpoint
CREATE INDEX "audit_entity" ON "audit_events" USING btree ("entity_type","entity_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_security" ON "audit_events" USING btree ("occurred_at") WHERE "audit_events"."category" = 'security';--> statement-breakpoint
CREATE UNIQUE INDEX "documents_year_number" ON "documents" USING btree ("year","number") WHERE "documents"."number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "documents_status" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_assignee" ON "documents" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "documents_external_ref" ON "documents" USING btree ("external_ref");--> statement-breakpoint
CREATE INDEX "waste_flags_open" ON "waste_flags" USING btree ("row_id") WHERE "waste_flags"."resolved_at" IS NULL;--> statement-breakpoint
CREATE INDEX "waste_dup_key" ON "waste_rows" USING btree ("operator_cui","ticket_no","weighed_at");--> statement-breakpoint
CREATE INDEX "waste_summary" ON "waste_rows" USING btree ("year","uat_id","status","fraction","destination_type");--> statement-breakpoint
CREATE INDEX "waste_import" ON "waste_rows" USING btree ("import_id","line_no");