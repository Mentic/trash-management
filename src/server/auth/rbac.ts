// Sec. 6.7, I07 — matricea de acces din BRD; verificată pe server la fiecare citire și mutație.
import "server-only";
import { notFound, redirect } from "next/navigation";
import type { Role } from "@/domain/codes";
import { getSession } from "./session";

const MATRIX = {
  "registry.read": ["registrar", "officer", "director"],
  "registry.read_all": ["registrar", "director"],
  "document.create": ["registrar"],
  "document.assign": ["registrar", "director"],
  "nomenclator.manage": ["registrar"],
  "registry.export": ["registrar", "officer", "director"],
  "waste.import": ["officer"],
  "waste.row.edit": ["officer"],
  "waste.summary.read": ["officer", "director"],
  "afm.read": ["officer", "director"],
  "journal.read": ["director"],
  "demo.reset": ["registrar", "officer", "director"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof MATRIX;
export const can = (role: Role, perm: Permission) => (MATRIX[perm] as readonly Role[]).includes(role);

export type CurrentUser = { id: string; username: string; displayName: string; role: Role };

/** Utilizatorul autentificat complet (parolă + 2FA) sau redirect la login. */
export async function requireUser(perm?: Permission): Promise<CurrentUser> {
  const s = await getSession();
  if (!s || s.session.stage !== "active") redirect("/login");
  const u = { id: s.user.id, username: s.user.username, displayName: s.user.displayName, role: s.user.role };
  if (perm && !can(u.role, perm)) notFound();
  return u;
}

/** R07 — aceeași regulă de acces pentru fișă, anexe, imprimare și export (QA02: inclusiv ciornele). */
export function canSeeDocument(user: CurrentUser, doc: { assigneeId: string | null; status: string }): boolean {
  if (doc.status === "draft" && !can(user.role, "document.create")) return false;
  return can(user.role, "registry.read_all") || doc.assigneeId === user.id;
}
