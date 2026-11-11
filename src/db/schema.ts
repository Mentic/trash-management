// Sec. 4 — schema fizică. Triggerele (jurnal append-only, anexe imuabile), rolurile și
// indexul de căutare sunt în migrarea SQL scrisă de mână `0001_guards.sql`.
import { sql } from "drizzle-orm";
import {
  bigint, bigserial, boolean, char, check, customType, date, index, inet, integer, jsonb, numeric,
  pgEnum, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";
import {
  DESTINATIONS, DIRECTIONS, DISPATCH_CHANNELS, DOC_STATUSES, FRACTIONS, INTAKE_CHANNELS, REQUEST_TYPES,
  ROLES, WASTE_ROW_STATUSES, WASTE_RULES,
} from "@/domain/codes";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });
const ts = (name: string) => timestamp(name, { withTimezone: true });
const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => ts("created_at").notNull().defaultNow();
const version = () => integer("version").notNull().default(0);

export const userRole = pgEnum("user_role", ROLES);
export const docDirection = pgEnum("doc_direction", DIRECTIONS);
export const docStatus = pgEnum("doc_status", DOC_STATUSES);
export const requestType = pgEnum("request_type", REQUEST_TYPES);
export const intakeChannel = pgEnum("intake_channel", INTAKE_CHANNELS);
export const dispatchChannel = pgEnum("dispatch_channel", DISPATCH_CHANNELS);
export const wasteFraction = pgEnum("waste_fraction", FRACTIONS);
export const destinationType = pgEnum("destination_type", DESTINATIONS);
export const wasteRowStatus = pgEnum("waste_row_status", WASTE_ROW_STATUSES);
export const wasteRule = pgEnum("waste_rule", WASTE_RULES);
export const uatEnvironment = pgEnum("uat_environment", ["urban", "rural"]);

// ── Identitate și securitate (S01–S08)
export const users = pgTable("users", {
  id: id(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: userRole("role").notNull(),
  passwordHash: text("password_hash").notNull(),
  totpSecretEnc: bytea("totp_secret_enc"),
  totpKeyVersion: smallint("totp_key_version"),
  totpEnrolledAt: ts("totp_enrolled_at"),
  totpLastStep: bigint("totp_last_step", { mode: "number" }),
  failedMfaCount: smallint("failed_mfa_count").notNull().default(0),
  lockedUntil: ts("locked_until"),
  createdAt: createdAt(),
  version: version(),
});

export const recoveryCodes = pgTable("recovery_codes", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  usedAt: ts("used_at"),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // HMAC-SHA256(token, SESSION_PEPPER)
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stage: text("stage", { enum: ["password_ok", "enrolling", "active"] }).notNull(),
  pendingTotpSecretEnc: bytea("pending_totp_secret_enc"),
  lastSeenAt: ts("last_seen_at").notNull(),
  expiresAt: ts("expires_at").notNull(),
  ip: inet("ip"),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
});

// ── Configurare (I01–I17)
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: ts("updated_at"),
});

export const annualParameters = pgTable("annual_parameters", {
  year: smallint("year").primaryKey(),
  annex6Pct: numeric("annex6_pct", { precision: 5, scale: 2 }).notNull(),
  recyclingTargetPct: numeric("recycling_target_pct", { precision: 5, scale: 2 }).notNull(),
  toleranceKg: integer("tolerance_kg").notNull(),
  afmRateLeiPerT: integer("afm_rate_lei_per_t").notNull(),
});

// ── Registratură (R01–R09)
export const registryCounters = pgTable(
  "registry_counters",
  { year: smallint("year").primaryKey(), lastNumber: integer("last_number").notNull() },
  (t) => [check("last_number_non_negative", sql`${t.lastNumber} >= 0`)],
);

export const dossiers = pgTable("dossiers", {
  id: id(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  retention: text("retention").notNull(),
  createdAt: createdAt(),
  version: version(),
});

export const archiveYears = pgTable("archive_years", {
  year: smallint("year").primaryKey(),
  closedAt: ts("closed_at"),
  closedBy: uuid("closed_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
});

export const documents = pgTable(
  "documents",
  {
    id: id(),
    year: smallint("year").notNull(),
    number: integer("number"),
    direction: docDirection("direction").notNull(),
    status: docStatus("status").notNull().default("draft"),
    registeredAt: ts("registered_at"),
    correspondentName: text("correspondent_name").notNull(),
    correspondentAddress: text("correspondent_address"), // R05: fără CNP
    externalRef: text("external_ref"),
    subject: text("subject").notNull(),
    requestType: requestType("request_type").notNull(),
    intakeChannel: intakeChannel("intake_channel"),
    deadline: date("deadline"),
    deadlineExtensionDays: smallint("deadline_extension_days").notNull().default(0),
    redirected: boolean("redirected").notNull().default(false),
    assigneeId: uuid("assignee_id").references(() => users.id),
    dossierId: uuid("dossier_id").references(() => dossiers.id),
    filedAt: ts("filed_at"),
    linkedDocumentId: uuid("linked_document_id"),
    replyDraft: text("reply_draft"),
    cancelReason: text("cancel_reason"),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: createdAt(),
    version: version(),
  },
  (t) => [
    uniqueIndex("documents_year_number").on(t.year, t.number).where(sql`${t.number} IS NOT NULL`),
    index("documents_status").on(t.status),
    index("documents_assignee").on(t.assigneeId),
    index("documents_external_ref").on(t.externalRef),
    check("number_iff_registered", sql`(${t.status} = 'draft') = (${t.number} IS NULL)`),
    check("filed_needs_dossier", sql`${t.status} <> 'filed' OR ${t.dossierId} IS NOT NULL`),
    check("cancel_needs_reason", sql`${t.status} <> 'cancelled' OR ${t.cancelReason} IS NOT NULL`),
  ],
);

export const dispatches = pgTable(
  "dispatches",
  {
    id: id(),
    documentId: uuid("document_id").notNull().references(() => documents.id),
    channel: dispatchChannel("channel").notNull(),
    dispatchedOn: date("dispatched_on").notNull(),
    proofRef: text("proof_ref"),
    proofAttachmentId: uuid("proof_attachment_id"),
    createdAt: createdAt(),
  },
  (t) => [check("dispatch_has_proof", sql`${t.proofRef} IS NOT NULL OR ${t.proofAttachmentId} IS NOT NULL`)],
);

// ── Evidența deșeurilor (D01–D08)
export const uats = pgTable("uats", {
  id: id(),
  siruta: text("siruta").notNull().unique(),
  sirutaSource: text("siruta_source").notNull().default("demo"), // I17
  name: text("name").notNull(),
  kind: text("kind", { enum: ["municipiu", "oraș", "comună"] }).notNull(),
  environment: uatEnvironment("environment").notNull(),
  population: integer("population").notNull(),
  organizedService: boolean("organized_service").notNull(), // I11
  contractedQtyKg: integer("contracted_qty_kg").notNull(), // I16
  version: version(),
});

export const operators = pgTable("operators", { id: id(), cui: text("cui").notNull().unique(), name: text("name").notNull() });

export const facilities = pgTable("facilities", {
  id: id(),
  name: text("name").notNull().unique(),
  destinationType: destinationType("destination_type").notNull(),
});

export const imports = pgTable(
  "imports",
  {
    id: id(),
    documentId: uuid("document_id").references(() => documents.id), // D05
    fileName: text("file_name").notNull(),
    sha256: char("sha256", { length: 64 }).notNull(),
    uploadedBy: uuid("uploaded_by").notNull().references(() => users.id),
    uploadedAt: ts("uploaded_at").notNull().defaultNow(),
    totalRows: integer("total_rows").notNull(),
    rejectedRows: integer("rejected_rows").notNull(),
    flaggedRows: integer("flagged_rows").notNull(),
    cleanRows: integer("clean_rows").notNull(),
    isSeed: boolean("is_seed").notNull().default(false),
  },
  (t) => [check("import_linked_to_document", sql`${t.isSeed} OR ${t.documentId} IS NOT NULL`)],
);

export const importRejections = pgTable("import_rejections", {
  id: id(),
  importId: uuid("import_id").notNull().references(() => imports.id, { onDelete: "cascade" }),
  lineNo: integer("line_no").notNull(),
  rule: wasteRule("rule").notNull(),
  ticketNo: text("ticket_no"),
  reasons: text("reasons").array().notNull(),
  raw: jsonb("raw").notNull(),
});

export const wasteRows = pgTable(
  "waste_rows",
  {
    id: id(),
    importId: uuid("import_id").notNull().references(() => imports.id),
    lineNo: integer("line_no").notNull(),
    period: date("period").notNull(), // prima zi a lunii
    year: smallint("year").generatedAlwaysAs(sql`extract(year from period)::smallint`),
    weighedAt: ts("weighed_at").notNull(),
    ticketNo: varchar("ticket_no", { length: 30 }).notNull(),
    vehicleNo: text("vehicle_no").notNull(),
    operatorCui: text("operator_cui").notNull(),
    uatId: uuid("uat_id").references(() => uats.id),
    sharedRoute: boolean("shared_route").notNull(),
    lerCode: char("ler_code", { length: 8 }).notNull(),
    fraction: wasteFraction("fraction").notNull(),
    destinationType: destinationType("destination_type").notNull(),
    facilityId: uuid("facility_id").notNull().references(() => facilities.id),
    reportedKg: integer("reported_kg").notNull(),
    ticketKg: integer("ticket_kg"),
    supportingDoc: text("supporting_doc"),
    status: wasteRowStatus("status").notNull(),
    statusReason: text("status_reason"),
    createdAt: createdAt(),
    version: version(),
  },
  (t) => [
    index("waste_dup_key").on(t.operatorCui, t.ticketNo, t.weighedAt),
    index("waste_summary").on(t.year, t.uatId, t.status, t.fraction, t.destinationType),
    index("waste_import").on(t.importId, t.lineNo),
    check("period_first_day", sql`extract(day from ${t.period}) = 1`),
    check("ler_format", sql`${t.lerCode} ~ '^[0-9]{2} [0-9]{2} [0-9]{2}$'`),
    check("reported_positive", sql`${t.reportedKg} > 0`),
  ],
);

export const wasteRowRouteUats = pgTable(
  "waste_row_route_uats",
  {
    rowId: uuid("row_id").notNull().references(() => wasteRows.id, { onDelete: "cascade" }),
    uatId: uuid("uat_id").notNull().references(() => uats.id),
  },
  (t) => [primaryKey({ columns: [t.rowId, t.uatId] })],
);

export const wasteFlags = pgTable(
  "waste_flags",
  {
    id: id(),
    rowId: uuid("row_id").notNull().references(() => wasteRows.id, { onDelete: "cascade" }),
    rule: wasteRule("rule").notNull(),
    details: jsonb("details").notNull(),
    duplicateOf: uuid("duplicate_of").references(() => wasteRows.id),
    resolvedAt: ts("resolved_at"),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolutionReason: text("resolution_reason"),
  },
  (t) => [
    index("waste_flags_open").on(t.rowId).where(sql`${t.resolvedAt} IS NULL`),
    check("flag_rule", sql`${t.rule} IN ('V2','V3','V4','V5')`),
  ],
);

export const annualApprovals = pgTable(
  "annual_approvals",
  {
    id: id(),
    uatId: uuid("uat_id").notNull().references(() => uats.id),
    year: smallint("year").notNull(),
    approvedTotalKg: bigint("approved_total_kg", { mode: "number" }).notNull(),
    approvedBy: uuid("approved_by").notNull().references(() => users.id),
    approvedAt: ts("approved_at").notNull(),
    reopenedBy: uuid("reopened_by").references(() => users.id),
    reopenedAt: ts("reopened_at"),
    reopenReason: text("reopen_reason"),
  },
  (t) => [
    uniqueIndex("annual_approval_active").on(t.uatId, t.year).where(sql`${t.reopenedAt} IS NULL`),
    check("reopen_has_reason", sql`(${t.reopenedAt} IS NULL) = (${t.reopenReason} IS NULL)`),
  ],
);

// ── Anexe imuabile (R02, D04) și jurnal append-only (R02, N09, S08)
export const attachments = pgTable(
  "attachments",
  {
    id: id(),
    documentId: uuid("document_id").references(() => documents.id),
    wasteRowId: uuid("waste_row_id").references(() => wasteRows.id),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: char("sha256", { length: 64 }).notNull(),
    storageKey: text("storage_key").notNull(),
    uploadedBy: uuid("uploaded_by").notNull().references(() => users.id),
    uploadedAt: ts("uploaded_at").notNull().defaultNow(),
  },
  (t) => [
    check("attachment_max_10mb", sql`${t.sizeBytes} <= 10485760`),
    check("attachment_one_owner", sql`num_nonnulls(${t.documentId}, ${t.wasteRowId}) = 1`),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    occurredAt: ts("occurred_at").notNull().defaultNow(),
    actorId: uuid("actor_id").references(() => users.id),
    category: text("category", { enum: ["security", "registry", "waste", "config", "demo"] }).notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    reason: text("reason"),
    ip: inet("ip"),
  },
  (t) => [
    index("audit_entity").on(t.entityType, t.entityId, t.occurredAt),
    index("audit_security").on(t.occurredAt).where(sql`${t.category} = 'security'`),
  ],
);
