// S08, N09 — jurnalul (doar citire). În demo îl vede directorul (Q7).
import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { auditEvents, users } from "@/db/schema";
import { requireUser } from "@/server/auth/rbac";
import { PageTitle, btnPrimary, input, th, td } from "@/components/ui";
import { HISTORY_LABEL, describeValues } from "@/lib/history";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
const CATS = { security: "Securitate", registry: "Registratură", waste: "Deșeuri", demo: "Demo", config: "Configurare" } as const;

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  await requireUser("journal.read");
  const { category } = await searchParams;
  const w: SQL[] = [];
  if (category && category in CATS) w.push(eq(auditEvents.category, category as keyof typeof CATS));
  const rows = await db.select({ e: auditEvents, actor: users.displayName }).from(auditEvents).leftJoin(users, eq(users.id, auditEvents.actorId))
    .where(and(...w)).orderBy(desc(auditEvents.id)).limit(300);
  return (
    <>
      <PageTitle>Jurnal</PageTitle>
      <form className="mb-4 flex items-end gap-2">
        <div><label htmlFor="category" className="text-xs font-medium">Categorie</label>
          <select id="category" name="category" defaultValue={category ?? ""} className={input}><option value="">Toate</option>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <button className={btnPrimary}>Filtrează</button>
      </form>
      <table className="w-full border-collapse">
        <caption className="mb-2 text-left text-sm">Ultimele 300 de evenimente. Jurnalul nu se poate modifica din aplicație (N09).</caption>
        <thead><tr><th scope="col" className={th}>Data</th><th scope="col" className={th}>Utilizator</th><th scope="col" className={th}>Categorie</th><th scope="col" className={th}>Acțiune</th><th scope="col" className={th}>Motiv / detalii</th><th scope="col" className={th}>IP</th></tr></thead>
        <tbody>{rows.map(({ e, actor }) => (
          <tr key={e.id}><td className={td}>{fmtDateTime(e.occurredAt)}</td><td className={td}>{actor ?? (e.entityType === "user" ? `${e.entityId} (necunoscut)` : "sistem")}</td>
            <td className={td}>{CATS[e.category]}</td><td className={td}>{HISTORY_LABEL[e.action] ?? e.action}</td>
            <td className={td}>{e.reason && <div><strong>Motiv:</strong> {e.reason}</div>}{describeValues(e.newValues)}</td><td className={td}>{e.ip ?? ""}</td></tr>
        ))}</tbody>
      </table>
    </>
  );
}
