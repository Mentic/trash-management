ALTER TYPE "public"."user_role" ADD VALUE 'mayor';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "uat_id" uuid;--> statement-breakpoint
ALTER TABLE "uats" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "uats" ADD COLUMN "brand_color" text;--> statement-breakpoint
ALTER TABLE "uats" ADD COLUMN "motto" text;--> statement-breakpoint
ALTER TABLE "uats" ADD COLUMN "emblem_storage_key" text;--> statement-breakpoint
ALTER TABLE "uats" ADD COLUMN "emblem_mime" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "uat_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uat_id_uats_id_fk" FOREIGN KEY ("uat_id") REFERENCES "public"."uats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_uat_id_uats_id_fk" FOREIGN KEY ("uat_id") REFERENCES "public"."uats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uats" ADD CONSTRAINT "uats_slug_unique" UNIQUE("slug");--> statement-breakpoint
-- Un cont de primărie aparține obligatoriu unei UAT (izolarea tenantului). Comparație pe text: valoarea nouă a enum-ului nu se poate folosi în aceeași tranzacție.
ALTER TABLE "users" ADD CONSTRAINT "mayor_has_uat" CHECK ("role"::text <> 'mayor' OR "uat_id" IS NOT NULL);--> statement-breakpoint
CREATE INDEX "documents_uat" ON "documents" ("uat_id");
