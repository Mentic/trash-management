// N08 — resetarea setului demo: golește baza, reîncarcă datele cu ancora mutată la ziua dinaintea resetării.
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import path from "node:path";
import { auditEvents, recoveryCodes, users } from "@/db/schema";
import { computeShift, type WasteShiftMode } from "@/domain/seedShift";
import { todayIso } from "@/lib/format";
import { clearStorage } from "@/storage/files";
import { loadFull } from "./full";
import { loadReference } from "./reference";

const TABLES = [
  "audit_events", "attachments", "dispatches", "waste_flags", "waste_row_route_uats", "waste_rows", "import_rejections",
  "imports", "annual_approvals", "documents", "archive_years", "registry_counters", "dossiers", "facilities", "operators",
  "uats", "annual_parameters", "settings", "recovery_codes", "sessions", "users",
];

export async function seedAll(opts: { truncate: boolean; keepMfa?: boolean; actorUsername?: string }) {
  const url = process.env.DATABASE_ADMIN_URL;
  if (!url) throw new Error("DATABASE_ADMIN_URL lipsește");
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const db = drizzle(client);
    const params = JSON.parse(readFileSync(path.join(process.cwd(), "seed/parametri.json"), "utf-8")) as { ancora_date: string };
    const mode = (process.env.DEMO_WASTE_SHIFT ?? "years") as WasteShiftMode;
    const shift = computeShift(params.ancora_date, todayIso(), mode);

    // Opțional: păstrează înrolările 2FA (ca la repetiții să nu se rescaneze codurile QR).
    const kept = opts.keepMfa
      ? await db.execute<{ username: string; totp_secret_enc: Buffer | null; totp_key_version: number | null; totp_enrolled_at: Date | null; totp_last_step: number | null; codes: string[] | null }>(sql`
          select u.username, u.totp_secret_enc, u.totp_key_version, u.totp_enrolled_at, u.totp_last_step,
                 array_agg(r.code_hash) filter (where r.used_at is null) as codes
          from users u left join recovery_codes r on r.user_id = u.id group by u.id`)
      : [];

    await db.transaction(async (tx) => {
      if (opts.truncate) await tx.execute(sql.raw(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`));
    });
    await clearStorage();
    await loadReference(db);
    await loadFull(db, shift);

    for (const k of kept) {
      if (!k.totp_secret_enc) continue;
      const [u] = await db
        .update(users)
        .set({
          totpSecretEnc: k.totp_secret_enc, totpKeyVersion: k.totp_key_version === null ? null : Number(k.totp_key_version),
          totpEnrolledAt: k.totp_enrolled_at ? new Date(k.totp_enrolled_at) : null, totpLastStep: k.totp_last_step === null ? null : Number(k.totp_last_step),
        })
        .where(sql`${users.username} = ${k.username}`)
        .returning({ id: users.id });
      if (u && k.codes?.length)
        await db.insert(recoveryCodes).values(k.codes.map((codeHash) => ({ userId: u.id, codeHash })));
    }

    const actor = opts.actorUsername
      ? (await db.select({ id: users.id }).from(users).where(sql`${users.username} = ${opts.actorUsername}`))[0]?.id ?? null
      : null;
    await db.insert(auditEvents).values({
      category: "demo", action: "demo.reset", entityType: "demo", actorId: actor,
      newValues: { anchorShiftedTo: shift.target, dayShift: shift.dayShift, monthShift: shift.monthShift, keepMfa: !!opts.keepMfa },
    });
    return shift;
  } finally {
    await client.end();
  }
}
