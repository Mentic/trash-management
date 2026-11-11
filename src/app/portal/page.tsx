// Multi-tenant: portalul primăriei. Doar datele UAT-ului propriu (izolare pe server, în resolveTenant).
import Link from "next/link";
import { requireUser } from "@/server/auth/rbac";
import { portalData, resolveTenant } from "@/server/queries/tenant";
import { afmInputs } from "@/server/queries/waste";
import { estimateAfm, DEMO_ELIGIBLE } from "@/domain/waste/afm";
import { Card, Stat, th, td } from "@/components/ui";
import { Emblem } from "@/components/TenantMark";
import { FolkBand } from "@/components/FolkBand";
import { BrandBody } from "@/components/BrandBody";
import { currentYear, fmtDate, fmtInt, fmtLei, fmtPeriod, fmtT } from "@/lib/format";
import type { DocStatus } from "@/domain/codes";

export const dynamic = "force-dynamic";

/** Starea documentului, în cuvintele primăriei (fără etapele interne ADI). */
const PUBLIC_STATUS: Record<DocStatus, string> = {
  draft: "—", registered: "Primit de ADI", assigned: "În lucru la ADI", drafting: "În lucru la ADI", in_approval: "În lucru la ADI",
  approved: "Răspuns aprobat", outgoing_registered: "Răspuns înregistrat", dispatched: "Răspuns trimis", filed: "Finalizat", cancelled: "Anulat",
};

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ uat?: string }> }) {
  const user = await requireUser("portal.read");
  const { uat } = await searchParams;
  const { tenant: t, preview } = await resolveTenant(user, uat);
  const year = currentYear();
  const [data, afm] = await Promise.all([portalData(t, year), afmInputs(year - 1, DEMO_ELIGIBLE)]);
  const total = data.months.reduce((s, m) => s + m.kg, 0);
  const max = Math.max(1, ...data.months.map((m) => m.kg));
  const a = afm.rows.find((r) => r.uatId === t.id);
  const est = estimateAfm({ qmunKg: a?.qmun ?? 0, qvalKg: a?.qval ?? 0, annex6Pct: Number(afm.params?.annex6Pct ?? 45), rateLeiPerT: afm.params?.afmRateLeiPerT ?? 50 });
  const open = data.docs.filter((d) => ["registered", "assigned", "drafting", "in_approval", "approved"].includes(d.status)).length;
  const style = { "--accent": t.color, "--accent-hover": `color-mix(in srgb, ${t.color} 82%, black)` } as React.CSSProperties;

  return (
    <div style={style}>
      {preview && <BrandBody color={t.color} />}
      {preview && (
        <p role="note" className="mb-6 text-[13px] text-[var(--ink-2)]">
          Previzualizare ADI a portalului · <Link className="text-[var(--accent)] hover:underline" href="/tenants">înapoi la Primării</Link>
        </p>
      )}
      <header className="mb-10 flex items-center gap-5">
        <Emblem slug={t.slug!} name={t.townHall} size={64} />
        <div>
          <h1 className="text-[32px] leading-tight">{t.townHall}</h1>
          <p className="mt-1 text-[15px] text-[var(--ink-2)]">{t.motto}</p>
        </div>
      </header>

      <section aria-label="Pe scurt" className="mb-10 grid grid-cols-1 gap-8 rounded-2xl bg-white p-6 ring-1 ring-[var(--hairline)] sm:grid-cols-3">
        <Stat label={`Deșeuri colectate și validate în ${year}`} value={fmtT(total)} />
        <Stat label={`Contribuție AFM estimată pentru ${year - 1}${afm.approved.has(t.id) ? "" : " (provizoriu)"} · termen 25 ian. ${year}`} value={fmtLei(est.contributionLei)} />
        <Stat label="Documente în lucru la ADI" value={open} />
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        <Card title={`Cantități lunare ${year}`} className="lg:col-span-3">
          {data.months.length === 0 ? <p className="text-[var(--ink-2)]">Nu există încă date validate pentru {year}.</p> : (
            <ul className="space-y-2.5">
              {data.months.map((m) => (
                <li key={m.period} className="grid grid-cols-[7.5rem_1fr_6.5rem] items-center gap-3 text-[14px]">
                  <span className="text-[var(--ink-2)]">{fmtPeriod(m.period)}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-[#efece4]" aria-hidden>
                    <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${(m.kg / max) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{fmtT(m.kg)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[12px] text-[var(--ink-2)]">Doar cursele verificate și validate de ADI. DEMO — date fictive.</p>
        </Card>

        <Card title="Date UAT" className="lg:col-span-2">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2.5 text-[15px] [&_dt]:text-[var(--ink-2)]">
            <dt>Cod SIRUTA</dt><dd>{t.siruta} <span className="text-[12px] text-[var(--ink-2)]">(demo)</span></dd>
            <dt>Mediu</dt><dd>{t.environment}</dd>
            <dt>Populație 2021</dt><dd>{fmtInt(t.population)}</dd>
            <dt>Cantitate contractată</dt><dd>{fmtT(t.contractedQtyKg)} / an</dd>
            <dt>Conturi portal</dt><dd>{data.accounts.map((u) => u.username).join(", ") || "—"}</dd>
          </dl>
        </Card>
      </div>

      <section aria-labelledby="corr" className="mt-10">
        <h2 id="corr" className="mb-4 text-[22px]">Corespondența cu ADI</h2>
        {data.docs.length === 0 ? <p className="text-[var(--ink-2)]">Nicio corespondență înregistrată.</p> : (
          <table className="w-full border-collapse">
            <caption className="sr-only">Documentele schimbate între primărie și ADI</caption>
            <thead><tr><th scope="col" className={th}>Număr ADI</th><th scope="col" className={th}>Document</th><th scope="col" className={th}>Stare</th></tr></thead>
            <tbody>{data.docs.map((d) => (
              <tr key={d.id}>
                <td className={`${td} whitespace-nowrap`}>{d.number}/{d.year}<div className="text-[12px] text-[var(--ink-2)]">{d.direction === "incoming" ? "Trimis de primărie" : "Trimis de ADI"} · {fmtDate(d.registeredAt)}</div></td>
                <td className={td}>{d.subject}{d.externalRef && <div className="text-[12px] text-[var(--ink-2)]">nr. primăriei {d.externalRef}</div>}</td>
                <td className={td}>{PUBLIC_STATUS[d.status]}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
      <FolkBand className="mt-12 opacity-60" />
    </div>
  );
}
