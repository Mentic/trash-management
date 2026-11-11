// R03 — nomenclatorul arhivistic (închiderea anului: Etapa 2).
import { sql, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documents, dossiers } from "@/db/schema";
import { requireUser, can } from "@/server/auth/rbac";
import { PageTitle, Card, input, th, td } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { upsertDossier } from "@/server/actions/registry";

export const dynamic = "force-dynamic";

export default async function DossiersPage() {
  const user = await requireUser("registry.read_all");
  const rows = await db
    .select({ id: dossiers.id, code: dossiers.code, title: dossiers.title, retention: dossiers.retention, n: sql<number>`count(${documents.id})::int` })
    .from(dossiers).leftJoin(documents, eq(documents.dossierId, dossiers.id)).groupBy(dossiers.id).orderBy(dossiers.code);
  return (
    <>
      <PageTitle>Nomenclator arhivistic</PageTitle>
      <table className="mb-6 w-full border-collapse">
        <caption className="mb-2 text-left text-sm">Dosarele ADI-ului (nomenclator demo, I04)</caption>
        <thead><tr><th scope="col" className={th}>Indicativ</th><th scope="col" className={th}>Denumire</th><th scope="col" className={th}>Termen de păstrare</th><th scope="col" className={th}>Documente</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}><td className={td}>{r.code}</td><td className={td}>{r.title}</td><td className={td}>{r.retention}</td><td className={td}>{r.n}</td></tr>
        ))}</tbody>
      </table>
      {can(user.role, "nomenclator.manage") && (
        <Card title="Dosar nou">
          <ActionForm action={upsertDossier} submit="Adaugă dosarul" className="grid max-w-2xl gap-2 md:grid-cols-3">
            <div><label htmlFor="code" className="text-sm">Indicativ (obligatoriu)</label><input id="code" name="code" className={input} required /></div>
            <div><label htmlFor="title" className="text-sm">Denumire (obligatoriu)</label><input id="title" name="title" className={input} required /></div>
            <div><label htmlFor="retention" className="text-sm">Termen de păstrare (obligatoriu)</label><input id="retention" name="retention" className={input} required placeholder="ex. 10 ani" /></div>
          </ActionForm>
        </Card>
      )}
      <p className="mt-4 text-sm text-[var(--ink-2)]">Închiderea anului arhivistic este în Etapa 2.</p>
    </>
  );
}
