import Link from "next/link";
import { input, btn, btnPrimary } from "@/components/ui";
import { DESTINATION_LABEL, FRACTION_LABEL } from "@/lib/labels";
import { MONTHS } from "@/lib/format";
import type { WasteFilters } from "@/server/queries/waste";

export function WasteFilterForm({ f, years, uatList, year, action, showUat = true }: {
  f: WasteFilters; years: number[]; uatList: { id: string; name: string }[]; year: number; action: string; showUat?: boolean;
}) {
  return (
    <form className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-7" aria-label="Filtre">
      <div><label htmlFor="year" className="text-[12px] text-[var(--ink-2)]">An</label>
        <select id="year" name="year" defaultValue={String(year)} className={input}>{years.map((y) => <option key={y}>{y}</option>)}</select></div>
      {showUat && <div className="col-span-2"><label htmlFor="uat" className="text-[12px] text-[var(--ink-2)]">UAT</label>
        <select id="uat" name="uat" defaultValue={f.uat ?? ""} className={input}><option value="">Toate</option>{uatList.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>}
      <div><label htmlFor="from" className="text-[12px] text-[var(--ink-2)]">De la luna</label>
        <select id="from" name="from" defaultValue={f.from ?? ""} className={input}><option value="">—</option>{MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>)}</select></div>
      <div><label htmlFor="to" className="text-[12px] text-[var(--ink-2)]">Până la luna</label>
        <select id="to" name="to" defaultValue={f.to ?? ""} className={input}><option value="">—</option>{MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>)}</select></div>
      <div><label htmlFor="fraction" className="text-[12px] text-[var(--ink-2)]">Fracție</label>
        <select id="fraction" name="fraction" defaultValue={f.fraction ?? ""} className={input}><option value="">Toate</option>{Object.entries(FRACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div><label htmlFor="destination" className="text-[12px] text-[var(--ink-2)]">Destinație</label>
        <select id="destination" name="destination" defaultValue={f.destination ?? ""} className={input}><option value="">Toate</option>{Object.entries(DESTINATION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div className="col-span-2 flex gap-2 md:col-span-7"><button className={btnPrimary}>Aplică filtrele</button><Link className={btn} href={action}>Resetează</Link></div>
    </form>
  );
}

export const qsOf = (f: Record<string, string | undefined>) =>
  new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
