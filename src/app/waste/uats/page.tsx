// D03, D02 (date) — date de referință pe UAT și estimarea contribuției AFM, cu formula și intrările vizibile.
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { uats } from "@/db/schema";
import { requireUser } from "@/server/auth/rbac";
import { afmInputs, availableYears } from "@/server/queries/waste";
import { estimateAfm, DEMO_ELIGIBLE } from "@/domain/waste/afm";
import { Badge, Card, PageTitle, input, btnPrimary, th, td } from "@/components/ui";
import { DESTINATION_LABEL } from "@/lib/labels";
import { currentYear, fmtInt, fmtLei, fmtT, fmtT1 } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function UatsPage({ searchParams }: { searchParams: Promise<{ year?: string; uat?: string }> }) {
  await requireUser("afm.read");
  const sp = await searchParams;
  const years = await availableYears();
  const year = Number(sp.year) || Math.min(...years.filter((y) => y < currentYear()), currentYear() - 1);
  const [list, inputs] = await Promise.all([db.select().from(uats).orderBy(asc(uats.name)), afmInputs(year, DEMO_ELIGIBLE)]);
  const pct = Number(inputs.params?.annex6Pct ?? 45);
  const rate = inputs.params?.afmRateLeiPerT ?? 50;
  const calc = list.map((u) => {
    const r = inputs.rows.find((x) => x.uatId === u.id);
    const res = estimateAfm({ qmunKg: r?.qmun ?? 0, qvalKg: r?.qval ?? 0, annex6Pct: pct, rateLeiPerT: rate });
    return { u, qmun: r?.qmun ?? 0, qval: r?.qval ?? 0, ...res, provisional: !inputs.approved.has(u.id) };
  });
  const sel = calc.find((c) => c.u.id === sp.uat) ?? calc.find((c) => c.u.name === "Comuna Berca") ?? calc[0]!;

  return (
    <>
      <PageTitle>Date UAT și calcule</PageTitle>
      <form className="mb-4 flex items-end gap-2" aria-label="Alegerea anului">
        <div><label htmlFor="year" className="text-xs font-medium">An</label>
          <select id="year" name="year" defaultValue={String(year)} className={input}>{years.map((y) => <option key={y}>{y}</option>)}</select></div>
        <input type="hidden" name="uat" value={sel.u.id} />
        <button className={btnPrimary}>Afișează</button>
      </form>

      <Card title={`Estimarea contribuției la Fondul pentru mediu — ${sel.u.name}, ${year}`} className="mb-6 border-[var(--accent)]">
        <p className="mb-4 flex flex-wrap gap-4 text-sm"><Badge tone="amber">DEMO — date fictive</Badge>{sel.provisional ? <Badge tone="amber" icon="~">provizoriu: anul nu este aprobat</Badge> : <Badge tone="green" icon="✓">an aprobat</Badge>}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div aria-label="Formula" className="space-y-2 font-mono text-sm">
            <p>Q<sub>ob</sub> = p<sub>anexa 6</sub> × Q<sub>mun</sub></p>
            <p>C = max(0, Q<sub>ob</sub> − Q<sub>val</sub>) × {rate} lei/t</p>
            <hr />
            <p>Q<sub>ob</sub> = {fmtInt(pct)}% × {fmtT(sel.qmun)} = <strong>{fmtT(sel.qobKg)}</strong></p>
            <p>C = max(0, {fmtT(sel.qobKg)} − {fmtT(sel.qval)}) × {rate} lei/t</p>
            <p className="text-lg">C = <strong data-testid="afm-result">{fmtLei(sel.contributionLei)}</strong></p>
          </div>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="font-medium">p (anexa 6, I05)</dt><dd>{fmtInt(pct)}%</dd>
            <dt className="font-medium">Q<sub>mun</sub> (I06)</dt><dd>{fmtT(sel.qmun)} — toate cursele validate/aprobate ale UAT-ului în {year}</dd>
            <dt className="font-medium">Q<sub>val</sub> (I12)</dt><dd>{fmtT(sel.qval)} — destinații: {DEMO_ELIGIBLE.map((d) => DESTINATION_LABEL[d]).join(", ")}</dd>
            <dt className="font-medium">Plătitor</dt><dd>UAT-ul (nu ADI-ul)</dd>
            <dt className="font-medium">Termen</dt><dd>Declarare și plată până la <strong>25 ianuarie {year + 1}</strong></dd>
          </dl>
        </div>
        <p className="mt-3 text-xs text-[var(--ink-2)]">Estimare orientativă (D03), distinctă de ținta de reciclare și de PAYT. Procentul din anexa 6 și baza Q<sub>mun</sub> sunt ipoteze demo de confirmat (I05, I06).</p>
      </Card>

      <table className="w-full border-collapse">
        <caption className="mb-2 text-left text-sm">Date de referință și estimarea AFM pe UAT, {year}. Selectați UAT-ul pentru calculul detaliat.</caption>
        <thead><tr>
          <th scope="col" className={th}>UAT</th><th scope="col" className={th}>SIRUTA (demo)</th><th scope="col" className={th}>Mediu</th>
          <th scope="col" className={`${th} text-right`}>Populație 2021</th><th scope="col" className={`${th} text-right`}>Cant. contractată</th>
          <th scope="col" className={`${th} text-right`}>Q<sub>mun</sub></th><th scope="col" className={`${th} text-right`}>Q<sub>val</sub></th>
          <th scope="col" className={`${th} text-right`}>Q<sub>ob</sub></th><th scope="col" className={`${th} text-right`}>Contribuție estimată</th>
        </tr></thead>
        <tbody>{calc.map((c) => (
          <tr key={c.u.id} className={c.u.id === sel.u.id ? "bg-blue-50" : undefined}>
            <th scope="row" className={`${td} text-left`}><Link className="text-[var(--accent)] hover:underline" href={`/waste/uats?year=${year}&uat=${c.u.id}`}>{c.u.name}</Link></th>
            <td className={td}>{c.u.siruta}</td><td className={td}>{c.u.environment}{!c.u.organizedService && " · fără serviciu organizat"}</td>
            <td className={`${td} text-right`}>{fmtInt(c.u.population)}</td><td className={`${td} text-right`}>{fmtT1(c.u.contractedQtyKg)}</td>
            <td className={`${td} text-right`}>{fmtT1(c.qmun)}</td><td className={`${td} text-right`}>{fmtT1(c.qval)}</td><td className={`${td} text-right`}>{fmtT1(c.qobKg)}</td>
            <td className={`${td} text-right font-medium`}>{fmtLei(c.contributionLei)}{c.provisional && " *"}</td>
          </tr>
        ))}</tbody>
      </table>
      <p className="mt-2 text-xs text-[var(--ink-2)]">* provizoriu (an neaprobat). Calculul taxei PAYT pe UAT este dezactivat (I13); datele pentru PAYT (D02) sunt în Etapa 2.</p>
    </>
  );
}
