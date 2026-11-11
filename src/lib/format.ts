// N05 — formate românești: ZZ.LL.AAAA, ora României, tone cu 3 zecimale, lei fără zecimale.
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

export const TZ = "Europe/Bucharest";

export const todayIso = () => format(new TZDate(Date.now(), TZ), "yyyy-MM-dd");
export const currentYear = () => new TZDate(Date.now(), TZ).getFullYear();

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  if (typeof d === "string") {
    const [y, m, day] = d.slice(0, 10).split("-");
    return `${day}.${m}.${y}`;
  }
  return format(new TZDate(d, TZ), "dd.MM.yyyy");
}

export const fmtDateTime = (d: Date | null | undefined) => (d ? format(new TZDate(d, TZ), "dd.MM.yyyy HH:mm") : "—");
export const isoDateInTz = (d: Date) => format(new TZDate(d, TZ), "yyyy-MM-dd");

/** „2026-03-14 09:42” (ora României) → Date. */
export function parseLocalDateTime(v: string): Date {
  const [d, t = "00:00"] = v.split(" ");
  const [y, m, day] = d!.split("-").map(Number);
  const [h, min] = t.split(":").map(Number);
  return new TZDate(y!, m! - 1, day!, h!, min!, 0, TZ);
}

export const localDateTime = (dateIso: string, h: number, min: number) => {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new TZDate(y!, m! - 1, d!, h, min, 0, TZ);
};

const nf3 = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const nf0 = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmtT = (kg: number) => `${nf3.format(kg / 1000)} t`;
export const fmtT1 = (kg: number) => `${nf1.format(kg / 1000)} t`;
export const fmtLei = (lei: number) => `${nf0.format(lei)} lei`;
export const fmtInt = (n: number) => nf0.format(n);

export const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
export const fmtPeriod = (period: string) => `${MONTHS[Number(period.slice(5, 7)) - 1]} ${period.slice(0, 4)}`;
