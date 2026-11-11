// Multi-tenant: datele demo ale primăriilor (identitate, conturi) și legarea documentelor de primăria corespondentă.
// Idempotent: rulează la fiecare pornire, deci aduce la zi și bazele create înainte de multi-tenant.
import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { documents, uats, users } from "@/db/schema";
import { slugify, TENANT_PALETTE, townHallName, uatNameFromTownHall } from "@/domain/tenants";
import { hashSecret } from "@/server/auth/password";

type AnyDb = PostgresJsDatabase<Record<string, unknown>>;
export const DEMO_TENANT_PASSWORD = "Primarie!2026";
export const tenantUsername = (slug: string) => `primaria.${slug}`;

export async function ensureTenants(db: AnyDb) {
  const list = await db.select().from(uats).orderBy(uats.name);
  let pwHash: string | null = null;
  for (const [i, u] of list.entries()) {
    const slug = u.slug ?? slugify(u.name);
    if (!u.slug || !u.brandColor || !u.motto) {
      await db.update(uats).set({
        slug,
        brandColor: u.brandColor ?? TENANT_PALETTE[i % TENANT_PALETTE.length]!.hex,
        motto: u.motto ?? `${u.name}, județul Buzău`,
      }).where(eq(uats.id, u.id));
    }
    const username = tenantUsername(slug);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
    if (!existing) {
      pwHash ??= await hashSecret(DEMO_TENANT_PASSWORD);
      await db.insert(users).values({ username, displayName: `${townHallName(u.name)} (cont demo)`, role: "mayor", uatId: u.id, passwordHash: pwHash });
    }
  }
  // Documentele schimbate cu primăriile: corespondentul „Primăria Comunei Berca” → UAT-ul Berca.
  const byName = new Map(list.map((u) => [u.name, u.id]));
  const unlinked = await db.select({ id: documents.id, c: documents.correspondentName }).from(documents).where(isNull(documents.uatId));
  for (const d of unlinked) {
    const uatId = byName.get(uatNameFromTownHall(d.c) ?? "");
    if (uatId) await db.update(documents).set({ uatId }).where(and(eq(documents.id, d.id), isNull(documents.uatId)));
  }
}
