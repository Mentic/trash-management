"use server";
// N08 — resetarea datelor demo, cu confirmare explicită (A07).
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireUser } from "@/server/auth/rbac";
import { seedAll } from "@/seed/reset";
import { SeedError } from "@/domain/seedShift";
import type { ActionResult } from "@/components/ActionForm";

export async function resetDemo(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("demo.reset");
  if (process.env.DEMO_RESET_ENABLED !== "true") return { error: "Resetarea este dezactivată pe acest server." };
  if (String(fd.get("confirm") ?? "").trim().toUpperCase() !== "RESETEAZĂ") return { error: "Tastați RESETEAZĂ pentru confirmare." };
  try {
    await seedAll({ truncate: true, keepMfa: fd.get("keepMfa") === "on", actorUsername: user.username });
  } catch (e) {
    if (e instanceof SeedError) return { error: e.message };
    throw e;
  }
  (await cookies()).delete("adi_session");
  redirect("/login");
}
