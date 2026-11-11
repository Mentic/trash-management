"use server";
// R01–R09 — mutațiile registraturii (sec. 5.1, 7). Fiecare: guard rol + scope, mașina de stări,
// blocare optimistă (version), jurnal în aceeași tranzacție.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, type Tx } from "@/db/client";
import { archiveYears, attachments, dispatches, documents, dossiers, users } from "@/db/schema";
import { allocateRegistryNumber } from "@/db/registry";
import { DISPATCH_CHANNELS, DIRECTIONS, INTAKE_CHANNELS, REQUEST_TYPES, type DocStatus } from "@/domain/codes";
import { nextStatus, TransitionError, type DocAction } from "@/domain/documentStateMachine";
import { computeDeadline, DEMO_DEADLINES, validateExtension } from "@/domain/deadlines";
import { audit } from "@/server/audit";
import { requireUser, can, type CurrentUser } from "@/server/auth/rbac";
import { clientIp } from "@/server/auth/session";
import { currentYear, isoDateInTz, todayIso } from "@/lib/format";
import { ALLOWED_MIME, MAX_BYTES, storeFile } from "@/storage/files";
import type { ActionResult } from "@/components/ActionForm";
import { INTERNAL_CORRESPONDENT, REQUEST_TYPES_BY_DIRECTION } from "@/lib/directions";

type Doc = typeof documents.$inferSelect;
class UserError extends Error {}

async function loadDoc(tx: Tx | typeof db, id: string, user: CurrentUser): Promise<Doc> {
  const [doc] = await tx.select().from(documents).where(eq(documents.id, id));
  if (!doc) throw new UserError("Documentul nu există.");
  if (!can(user.role, "registry.read_all") && doc.assigneeId !== user.id) throw new UserError("Documentul nu există sau nu aveți acces.");
  return doc;
}

function checkVersion(doc: Doc, fd: FormData) {
  const v = Number(fd.get("version"));
  if (Number.isFinite(v) && v !== doc.version) throw new UserError("Documentul a fost modificat de altcineva. Reîncărcați pagina.");
}

async function update(tx: Tx, doc: Doc, set: Partial<typeof documents.$inferInsert>) {
  const r = await tx.update(documents).set({ ...set, version: doc.version + 1 })
    .where(and(eq(documents.id, doc.id), eq(documents.version, doc.version))).returning({ id: documents.id });
  if (!r.length) throw new UserError("Documentul a fost modificat de altcineva. Reîncărcați pagina.");
}

async function log(tx: Tx, user: CurrentUser, doc: { id: string }, action: string, extra: { reason?: string | null; oldValues?: unknown; newValues?: unknown } = {}) {
  await audit(tx, {
    category: "registry", action: `document.${action}`, entityType: "document", entityId: doc.id, actorId: user.id,
    reason: extra.reason ?? null, oldValues: extra.oldValues ?? null, newValues: extra.newValues ?? null, ip: await clientIp(),
  });
}

function next(doc: Doc, action: DocAction, user: CurrentUser, reason?: string): DocStatus {
  return nextStatus({ action, doc: { status: doc.status, direction: doc.direction, assigneeId: doc.assigneeId }, actor: user, reason });
}

/** Rulează o acțiune: erorile de business devin mesaje lângă formular; succesul reîmprospătează fișa. */
async function run(id: string, ok: string, fn: (tx: Tx, user: CurrentUser) => Promise<void | string>): Promise<ActionResult> {
  const user = await requireUser("registry.read");
  let target: string | void;
  try {
    target = await db.transaction((tx) => fn(tx, user));
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    if (e instanceof TransitionError)
      return { error: e.message.includes("motiv") ? "Completați motivul." : "Acțiunea nu este permisă în starea curentă a documentului." };
    throw e;
  }
  revalidatePath("/registry");
  // Mesaj de confirmare vizibil pe fișă (textul se construiește la afișare din cheie — lib/messages.ts).
  redirect(`/registry/${target || id}?ok=${ok}`);
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function saveFiles(tx: Tx, user: CurrentUser, docId: string, files: File[]): Promise<string[]> {
  const ids: string[] = [];
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > 50 * 1024 * 1024) throw new UserError("Fișierele depășesc împreună 50 MB; adăugați restul după salvare.");
  for (const f of files) {
    if (!f.size) continue;
    if (f.size > MAX_BYTES) throw new UserError(`Fișierul ${f.name} depășește 10 MB.`);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const mime = ALLOWED_MIME[ext];
    if (!mime) throw new UserError(`Tip de fișier nepermis: ${f.name}. Permise: PDF, JPG, PNG, DOCX, XLSX, CSV, TXT.`);
    const bytes = Buffer.from(await f.arrayBuffer());
    const { sha256, storageKey } = await storeFile(bytes);
    const [a] = await tx.insert(attachments).values({ documentId: docId, fileName: f.name, mimeType: mime, sizeBytes: bytes.length, sha256, storageKey, uploadedBy: user.id }).returning({ id: attachments.id });
    ids.push(a!.id);
    await log(tx, user, { id: docId }, "anexa_adaugata", { newValues: { fileName: f.name, sha256 } });
  }
  return ids;
}

/** Confirmarea: număr atomic (R06), termen (R04), stare inițială (5.1). */
async function confirm(tx: Tx, user: CurrentUser, doc: Doc) {
  const status = next(doc, "confirm", user);
  const year = currentYear();
  const number = await allocateRegistryNumber(tx, year);
  // R04: termenul de răspuns privește doar documentele primite.
  const deadline = doc.direction === "incoming" ? computeDeadline(todayIso(), doc.requestType, { redirected: doc.redirected }, DEMO_DEADLINES) : null;
  await update(tx, doc, { status, year, number, registeredAt: new Date(), deadline });
  await log(tx, user, doc, "confirmat", { newValues: { numar: `${number}/${year}`, termen: deadline } });
}

const docSchema = z.object({
  direction: z.enum(DIRECTIONS),
  correspondentName: z.string().trim().min(1, "Completați expeditorul sau destinatarul."),
  correspondentAddress: z.string().trim().optional(),
  externalRef: z.string().trim().optional(),
  subject: z.string().trim().min(1, "Completați obiectul."),
  requestType: z.enum(REQUEST_TYPES),
  intakeChannel: z.enum(INTAKE_CHANNELS).optional(),
  redirected: z.boolean(),
});

export async function createDocument(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("document.create");
  const direction = str(fd, "direction");
  const parsed = docSchema.safeParse({
    direction, correspondentName: direction === "internal" ? INTERNAL_CORRESPONDENT : str(fd, "correspondentName"),
    correspondentAddress: str(fd, "correspondentAddress") || undefined, externalRef: str(fd, "externalRef") || undefined,
    subject: str(fd, "subject"), requestType: str(fd, "requestType"), intakeChannel: str(fd, "intakeChannel") || undefined,
    redirected: fd.get("redirected") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  if (!REQUEST_TYPES_BY_DIRECTION[parsed.data.direction].includes(parsed.data.requestType))
    return { error: "Tipul documentului nu se potrivește cu sensul ales." };
  if (parsed.data.direction !== "incoming") Object.assign(parsed.data, { externalRef: undefined, intakeChannel: undefined, redirected: false });
  const intent = str(fd, "intent");
  let id = "";
  try {
    await db.transaction(async (tx) => {
      const [doc] = await tx.insert(documents).values({ ...parsed.data, year: currentYear(), createdBy: user.id }).returning();
      id = doc!.id;
      if (intent !== "confirm") await log(tx, user, doc!, "ciorna_salvata");
      await saveFiles(tx, user, doc!.id, fd.getAll("files") as File[]);
      if (intent === "confirm") await confirm(tx, user, doc!);
    });
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  revalidatePath("/registry");
  redirect(`/registry/${id}?ok=${intent === "confirm" ? "confirmed" : "draft"}`);
}

export async function confirmDraft(_: ActionResult, fd: FormData) {
  const id = str(fd, "id");
  return run(id, "confirmed", async (tx, user) => {
    const doc = await loadDoc(tx, id, user);
    checkVersion(doc, fd);
    await confirm(tx, user, doc);
  });
}

export async function deleteDraft(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("document.create");
  const id = str(fd, "id");
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc || doc.status !== "draft") return { error: "Doar ciornele se pot șterge." };
  const files = await db.select({ id: attachments.id }).from(attachments).where(eq(attachments.documentId, id));
  if (files.length) return { error: "Ciorna are anexe; anexele nu se pot șterge (R02). Confirmați sau anulați documentul." };
  await db.delete(documents).where(eq(documents.id, id));
  await audit(db, { category: "registry", action: "document.ciorna_stearsa", entityType: "document", entityId: id, actorId: user.id });
  revalidatePath("/registry");
  redirect("/registry");
}

export async function assignDocument(_: ActionResult, fd: FormData) {
  const id = str(fd, "id");
  return run(id, "assigned", async (tx, user) => {
    const doc = await loadDoc(tx, id, user);
    checkVersion(doc, fd);
    const status = next(doc, "assign", user);
    const [officer] = await tx.select().from(users).where(eq(users.id, str(fd, "assigneeId")));
    if (!officer || officer.role !== "officer") throw new UserError("Alegeți un responsabil.");
    await update(tx, doc, { status, assigneeId: officer.id });
    await log(tx, user, doc, "repartizat", { newValues: { responsabil: officer.displayName } });
  });
}

export async function saveReply(_: ActionResult, fd: FormData) {
  const id = str(fd, "id");
  return run(id, str(fd, "intent") === "submit" ? "submitted" : "reply", async (tx, user) => {
    let doc = await loadDoc(tx, id, user);
    checkVersion(doc, fd);
    const text = str(fd, "replyDraft");
    if (!text) throw new UserError("Scrieți textul răspunsului.");
    if (doc.status === "assigned") {
      const status = next(doc, "startDrafting", user);
      await update(tx, doc, { status, replyDraft: text });
      doc = { ...doc, status, replyDraft: text, version: doc.version + 1 };
    } else if (doc.status === "drafting" && doc.assigneeId === user.id) {
      await update(tx, doc, { replyDraft: text });
      doc = { ...doc, replyDraft: text, version: doc.version + 1 };
    } else throw new TransitionError("saveReply");
    await log(tx, user, doc, "raspuns_salvat");
    await saveFiles(tx, user, doc.id, fd.getAll("files") as File[]);
    if (str(fd, "intent") === "submit") {
      const status = next(doc, "submitForApproval", user);
      await update(tx, doc, { status });
      await log(tx, user, doc, "trimis_la_aprobare");
    }
  });
}

export async function returnReply(_: ActionResult, fd: FormData) {
  const id = str(fd, "id");
  return run(id, "returned", async (tx, user) => {
    const doc = await loadDoc(tx, id, user);
    checkVersion(doc, fd);
    const reason = str(fd, "reason");
    const status = next(doc, "return", user, reason);
    await update(tx, doc, { status });
    await log(tx, user, doc, "returnat", { reason });
  });
}

export async function approveReply(_: ActionResult, fd: FormData) {
  const id = str(fd, "id");
  return run(id, "approved", async (tx, user) => {
    const doc = await loadDoc(tx, id, user);
    checkVersion(doc, fd);
    await update(tx, doc, { status: next(doc, "approve", user) });
    await log(tx, user, doc, "aprobat");
  });
}

/** R06, I02 — răspunsul primește un număr nou de ieșire, legat de intrare în ambele sensuri. */
export async function registerOutgoing(_: ActionResult, fd: FormData) {
  const id = str(fd, "id");
  return run(id, "outgoing", async (tx, user) => {
    const doc = await loadDoc(tx, id, user);
    checkVersion(doc, fd);
    const status = next(doc, "registerOutgoing", user);
    const year = currentYear();
    const number = await allocateRegistryNumber(tx, year);
    const [out] = await tx.insert(documents).values({
      year, number, direction: "outgoing", status: "outgoing_registered", registeredAt: new Date(),
      correspondentName: doc.correspondentName, correspondentAddress: doc.correspondentAddress,
      subject: `Răspuns la ${doc.number}/${doc.year} – ${doc.subject}`, requestType: "reply", assigneeId: doc.assigneeId,
      linkedDocumentId: doc.id, replyDraft: doc.replyDraft, dossierId: doc.dossierId, createdBy: user.id,
    }).returning();
    await update(tx, doc, { status, linkedDocumentId: out!.id });
    await log(tx, user, out!, "confirmat", { newValues: { numar: `${number}/${year}`, legat_de: `${doc.number}/${doc.year}` } });
    await log(tx, user, doc, "iesire_inregistrata", { newValues: { iesire: `${number}/${year}` } });
  });
}

/** R09 — canal, dată și dovadă; starea se oglindește pe intrare și pe ieșire. */
export async function recordDispatch(_: ActionResult, fd: FormData) {
  const id = str(fd, "id");
  return run(id, "dispatched", async (tx, user) => {
    const doc = await loadDoc(tx, id, user);
    checkVersion(doc, fd);
    const channel = z.enum(DISPATCH_CHANNELS).safeParse(str(fd, "channel"));
    const date = str(fd, "date");
    const proof = str(fd, "proofRef");
    if (!channel.success) throw new UserError("Alegeți canalul de expediere.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new UserError("Completați data expedierii.");
    const proofFile = fd.get("proofFile") as File | null;
    if (!proof && !proofFile?.size) throw new UserError("Adăugați dovada expedierii (număr de confirmare sau fișier).");
    const status = next(doc, "recordDispatch", user);
    const pair = doc.linkedDocumentId ? await loadDoc(tx, doc.linkedDocumentId, user) : null;
    const outgoing = doc.direction === "outgoing" ? doc : pair?.direction === "outgoing" ? pair : doc;
    let proofAttachmentId: string | null = null;
    // QA03: dovada este exact fișierul încărcat acum, nu prima anexă a documentului.
    if (proofFile?.size) proofAttachmentId = (await saveFiles(tx, user, outgoing.id, [proofFile]))[0] ?? null;
    await tx.insert(dispatches).values({ documentId: outgoing.id, channel: channel.data, dispatchedOn: date, proofRef: proof || null, proofAttachmentId });
    await update(tx, doc, { status });
    await log(tx, user, doc, "expediat", { newValues: { canal: channel.data, data: date, dovada: proof || proofFile?.name } });
    if (pair && pair.status === "outgoing_registered") {
      await update(tx, pair, { status: "dispatched" });
      await log(tx, user, pair, "expediat", { newValues: { canal: channel.data, data: date, dovada: proof || proofFile?.name } });
    }
  });
}

async function checkDossier(tx: Tx, doc: Doc, dossierId: string) {
  const [d] = await tx.select().from(dossiers).where(eq(dossiers.id, dossierId));
  if (!d) throw new UserError("Alegeți dosarul (obligatoriu la clasare).");
  const [y] = await tx.select().from(archiveYears).where(eq(archiveYears.year, doc.year));
  if (y?.closedAt) throw new UserError(`Anul ${doc.year} este închis; clasarea nu mai este permisă.`);
  return d;
}

export async function fileDocument(_: ActionResult, fd: FormData) {
  const id = str(fd, "id");
  return run(id, "filed", async (tx, user) => {
    const doc = await loadDoc(tx, id, user);
    checkVersion(doc, fd);
    const action: DocAction = doc.status === "registered" || doc.status === "assigned" ? "fileWithoutReply" : "file";
    const status = next(doc, action, user);
    const d = await checkDossier(tx, doc, str(fd, "dossierId"));
    await update(tx, doc, { status, dossierId: d.id, filedAt: new Date() });
    await log(tx, user, doc, action === "file" ? "clasat" : "clasat_fara_raspuns", { newValues: { dosar: d.code } });
  });
}

export async function cancelDocument(_: ActionResult, fd: FormData) {
  const id = str(fd, "id");
  return run(id, "cancelled", async (tx, user) => {
    const doc = await loadDoc(tx, id, user);
    checkVersion(doc, fd);
    const reason = str(fd, "reason");
    const status = next(doc, "cancel", user, reason);
    await update(tx, doc, { status, cancelReason: reason });
    await log(tx, user, doc, "anulat", { reason });
  });
}

const CORRECTABLE = ["subject", "correspondentName", "correspondentAddress", "externalRef"] as const;

/** R02, R8 — corecție cu motiv; jurnalul păstrează valoarea veche și cea nouă. */
export async function correctMetadata(_: ActionResult, fd: FormData) {
  const id = str(fd, "id");
  return run(id, "corrected", async (tx, user) => {
    const doc = await loadDoc(tx, id, user);
    checkVersion(doc, fd);
    const reason = str(fd, "reason");
    next(doc, "correctMetadata", user, reason);
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    for (const k of CORRECTABLE) {
      const v = str(fd, k) || null;
      if ((doc[k] ?? null) !== v) { oldValues[k] = doc[k]; newValues[k] = v; }
    }
    if (!Object.keys(newValues).length) throw new UserError("Nicio valoare nu s-a schimbat.");
    if (newValues.subject === null || newValues.correspondentName === null) throw new UserError("Obiectul și corespondentul nu pot fi goale.");
    await update(tx, doc, newValues as Partial<Doc>);
    await log(tx, user, doc, "corectat", { reason, oldValues, newValues });
  });
}

export async function extendDeadline(_: ActionResult, fd: FormData) {
  const id = str(fd, "id");
  return run(id, "extended", async (tx, user) => {
    const doc = await loadDoc(tx, id, user);
    checkVersion(doc, fd);
    const reason = str(fd, "reason");
    next(doc, "extendDeadline", user, reason);
    const days = Number(str(fd, "days"));
    const total = doc.deadlineExtensionDays + days;
    const err = validateExtension(doc.requestType, total, DEMO_DEADLINES);
    if (!Number.isInteger(days) || days <= 0) throw new UserError("Numărul de zile trebuie să fie pozitiv.");
    if (err) throw new UserError(err);
    if (!doc.deadline) throw new UserError("Documentul nu are termen.");
    const deadline = computeDeadline(isoDateInTz(doc.registeredAt!), doc.requestType, { redirected: doc.redirected, extensionDays: total }, DEMO_DEADLINES);
    await update(tx, doc, { deadline, deadlineExtensionDays: total });
    await log(tx, user, doc, "termen_prelungit", { reason, oldValues: { termen: doc.deadline }, newValues: { termen: deadline } });
  });
}

export async function addAttachments(_: ActionResult, fd: FormData) {
  const id = str(fd, "id");
  return run(id, "attachments", async (tx, user) => {
    const doc = await loadDoc(tx, id, user);
    if (doc.status === "cancelled" || doc.status === "filed") throw new UserError("Documentul este închis.");
    const files = (fd.getAll("files") as File[]).filter((f) => f.size);
    if (!files.length) throw new UserError("Alegeți cel puțin un fișier.");
    await saveFiles(tx, user, doc.id, files);
  });
}

export async function upsertDossier(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("nomenclator.manage");
  const code = str(fd, "code"), title = str(fd, "title"), retention = str(fd, "retention");
  if (!code || !title || !retention) return { error: "Completați indicativul, denumirea și termenul de păstrare." };
  const [existing] = await db.select().from(dossiers).where(eq(dossiers.code, code));
  if (existing) return { error: `Indicativul ${code} există deja.` };
  await db.insert(dossiers).values({ code, title, retention });
  await audit(db, { category: "registry", action: "dosar.adaugat", entityType: "dossier", entityId: code, actorId: user.id, newValues: { code, title, retention } });
  revalidatePath("/registry/dossiers");
  return { ok: "Dosar adăugat." };
}

/** QA10 — o ciornă se poate continua și corecta înainte de atribuirea numărului (fără motiv: nu are număr). */
export async function updateDraft(_: ActionResult, fd: FormData) {
  const id = str(fd, "id");
  return run(id, "draft", async (tx, user) => {
    if (user.role !== "registrar") throw new TransitionError("updateDraft");
    const doc = await loadDoc(tx, id, user);
    checkVersion(doc, fd);
    if (doc.status !== "draft") throw new UserError("Doar ciornele se pot edita liber; după confirmare folosiți „Corectează metadatele”.");
    const requestType = str(fd, "requestType") as (typeof REQUEST_TYPES)[number];
    if (!REQUEST_TYPES_BY_DIRECTION[doc.direction].includes(requestType)) throw new UserError("Tipul documentului nu se potrivește cu sensul.");
    const subject = str(fd, "subject");
    const correspondentName = doc.direction === "internal" ? INTERNAL_CORRESPONDENT : str(fd, "correspondentName");
    if (!subject || !correspondentName) throw new UserError("Obiectul și corespondentul sunt obligatorii.");
    const incoming = doc.direction === "incoming";
    const intake = str(fd, "intakeChannel");
    await update(tx, doc, {
      subject, correspondentName, requestType,
      correspondentAddress: str(fd, "correspondentAddress") || null,
      externalRef: incoming ? str(fd, "externalRef") || null : null,
      intakeChannel: incoming && (INTAKE_CHANNELS as readonly string[]).includes(intake) ? (intake as (typeof INTAKE_CHANNELS)[number]) : null,
      redirected: incoming && requestType === "petition" && fd.get("redirected") === "on",
    });
    await saveFiles(tx, user, doc.id, (fd.getAll("files") as File[]).filter((f) => f.size));
    await log(tx, user, doc, "ciorna_salvata");
  });
}
