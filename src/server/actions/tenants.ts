"use server";
// Multi-tenant: personalizarea unei primării (culoare, motto, stemă) — doar directorul ADI.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { uats } from "@/db/schema";
import { contrastWithWhite, isValidBrandColor } from "@/domain/tenants";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/rbac";
import { storeFile } from "@/storage/files";
import type { ActionResult } from "@/components/ActionForm";

const EMBLEM_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml", webp: "image/webp" };
const MAX_EMBLEM = 1024 * 1024;

export async function updateTenant(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("tenants.manage");
  const id = String(fd.get("id") ?? "");
  const [t] = await db.select().from(uats).where(eq(uats.id, id));
  if (!t) return { error: "Primăria nu există." };
  const custom = String(fd.get("customColor") ?? "").trim();
  const color = (custom || String(fd.get("color") ?? "")).toLowerCase();
  if (!isValidBrandColor(color))
    return { error: `Culoarea ${color || "aleasă"} are contrast ${color.startsWith("#") && color.length === 7 ? contrastWithWhite(color).toFixed(1) : "?"}:1 cu textul alb; minimum 4,5:1 (accesibilitate). Alegeți o nuanță mai închisă.` };
  const motto = String(fd.get("motto") ?? "").trim().slice(0, 120);
  if (!motto) return { error: "Completați textul de sub nume (ex. „Comuna Berca, județul Buzău”)." };

  const set: Partial<typeof uats.$inferInsert> = { brandColor: color, motto };
  const file = fd.get("emblem") as File | null;
  if (file?.size) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mime = EMBLEM_TYPES[ext];
    if (!mime) return { error: "Stema: PNG, JPG, WEBP sau SVG." };
    if (file.size > MAX_EMBLEM) return { error: "Stema: maximum 1 MB." };
    const { storageKey } = await storeFile(Buffer.from(await file.arrayBuffer()));
    Object.assign(set, { emblemStorageKey: storageKey, emblemMime: mime });
  }
  if (fd.get("resetEmblem") === "on") Object.assign(set, { emblemStorageKey: null, emblemMime: null });

  await db.update(uats).set(set).where(eq(uats.id, id));
  await audit(db, {
    category: "config", action: "tenant.updated", entityType: "uat", entityId: id, actorId: user.id,
    oldValues: { culoare: t.brandColor, motto: t.motto }, newValues: { culoare: color, motto, stema: file?.size ? file.name : fd.get("resetEmblem") === "on" ? "stilizată" : "neschimbată" },
  });
  revalidatePath("/", "layout");
  redirect(`/tenants?ok=${t.slug}`);
}
