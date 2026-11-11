// Sec. 10 — mutarea datelor setului demo: ancora devine ziua dinaintea resetării.
import { addDays, addMonths, differenceInCalendarDays, format, parseISO, subDays } from "date-fns";

export type WasteShiftMode = "years" | "months";

export class SeedError extends Error {}

export function computeShift(anchorIso: string, todayIso: string, mode: WasteShiftMode) {
  const anchor = parseISO(anchorIso);
  const target = subDays(parseISO(todayIso), 1);
  if (target.getFullYear() !== anchor.getFullYear())
    throw new SeedError("anchor_year_crossed: regenerați setul cu o ancoră nouă (gen_seed.py)");
  const dayShift = differenceInCalendarDays(target, anchor);
  const monthShift = mode === "months" ? target.getMonth() - anchor.getMonth() : 0;
  return { dayShift, monthShift, target: format(target, "yyyy-MM-dd") };
}

export const shiftDate = (iso: string, days: number) => format(addDays(parseISO(iso), days), "yyyy-MM-dd");

/** „2026-03” + m luni. */
export const shiftPeriod = (period: string, months: number) =>
  format(addMonths(parseISO(`${period}-01`), months), "yyyy-MM");

/** „2026-03-31 09:40” + m luni, ziua limitată la ultima zi a lunii (rămâne în perioadă — V1). */
export function shiftWeighing(value: string, months: number): string {
  const [d, t] = value.split(" ");
  return `${format(addMonths(parseISO(d!), months), "yyyy-MM-dd")} ${t}`;
}
