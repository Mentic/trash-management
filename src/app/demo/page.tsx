// Kit demo (sec. 14): resetarea datelor și fișierele de import pentru scenariul D.
import { requireUser } from "@/server/auth/rbac";
import { Card, PageTitle, input, btn } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { resetDemo } from "@/server/actions/demo";
import { fmtDate, todayIso } from "@/lib/format";
import { shiftDate } from "@/domain/seedShift";

export const dynamic = "force-dynamic";

const FILES = [
  ["import_2026-10_scenariu_erori.csv", "Scenariul D: Berca și Cislău, câte un caz V1–V4 (26 de rânduri)"],
  ["import_2026-10_restul_uat_curat.csv", "Fișier curat: 220 de curse, 5 UAT-uri"],
  ["import_2026-10_test_V5_V6.csv", "Test V5 (UAT necunoscut) și V6 (an aprobat), 4 rânduri"],
] as const;

export default async function DemoPage() {
  await requireUser("demo.reset");
  const enabled = process.env.DEMO_RESET_ENABLED === "true";
  return (
    <>
      <PageTitle>Kit demo</PageTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Fișiere de import">
          <ul className="space-y-2 text-sm">{FILES.map(([f, d]) => (
            <li key={f}><a className="underline" href={`/api/demo-files/${f}`} download>{f}</a><br /><span className="text-gray-600">{d}</span></li>
          ))}</ul>
        </Card>
        <Card title="Resetarea datelor demo">
          <p className="mb-2 text-sm">Reîncarcă setul demo (120 de documente, 5.321 de curse). Datele se mută astfel încât ancora să fie ieri ({fmtDate(shiftDate(todayIso(), -1))}). Toate modificările și sesiunile se pierd.</p>
          {enabled ? (
            <ActionForm action={resetDemo} submit="Resetează datele demo" submitClass={btn} confirm="Toate modificările se pierd. Continuați?" className="space-y-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="keepMfa" defaultChecked /> Păstrează înrolările 2FA (fără rescanarea codurilor QR)</label>
              <label htmlFor="confirm" className="block text-sm font-medium">Tastați RESETEAZĂ pentru confirmare (obligatoriu)</label>
              <input id="confirm" name="confirm" className={input} autoComplete="off" required />
            </ActionForm>
          ) : <p className="text-sm">Resetarea este dezactivată pe acest server (DEMO_RESET_ENABLED).</p>}
        </Card>
      </div>
      <Card title="Scriptul de 15 minute" className="mt-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Ana: autentificare, cod QR scanat live, coduri de recuperare (L1–L3).</li>
          <li>Ana înregistrează adresa externă 438/2026 ca petiție → 121/2026 și o repartizează lui Mihai (R1–R2).</li>
          <li>Mihai redactează și trimite la aprobare; Elena returnează cu motiv, apoi aprobă (R3–R4).</li>
          <li>Ana înregistrează ieșirea 122/2026, consemnează expedierea și clasează; căutarea 438/2026 (R5–R7).</li>
          <li>Ana înregistrează raportul pe octombrie (123/2026), clasat fără răspuns; Mihai importă fișierul de scenariu (D1–D4).</li>
          <li>Elena: Situație pe UAT → total → lună → tichet; export CSV; estimarea AFM Berca 2025 (D5, D7).</li>
        </ol>
      </Card>
    </>
  );
}
