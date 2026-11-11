// R04, I03 — termene în zile calendaristice (Q5), calculate la citire, fără job.
import { addDays, differenceInCalendarDays, parseISO, format } from "date-fns";
import type { RequestType } from "./codes";

export interface DeadlineConfig {
  enabled: boolean;
  daysByType: Partial<Record<RequestType, number>>;
  redirectDays: number;
  warnDaysBefore: number;
  petitionMaxExtensionDays: number;
}

/** Valori demo din parametri.json (termene_zile). În aplicație vin din `settings`. */
export const DEMO_DEADLINES: DeadlineConfig = {
  enabled: true,
  daysByType: { petition: 30, public_info: 10, institution_letter: 30, other: 30 },
  redirectDays: 5,
  warnDaysBefore: 5,
  petitionMaxExtensionDays: 15,
};

export function computeDeadline(
  registeredOn: string,
  type: RequestType,
  opts: { redirected?: boolean; extensionDays?: number },
  cfg: DeadlineConfig,
): string | null {
  if (!cfg.enabled) return null;
  const base = opts.redirected ? cfg.redirectDays : cfg.daysByType[type];
  if (base === undefined) return null;
  return format(addDays(parseISO(registeredOn), base + (opts.extensionDays ?? 0)), "yyyy-MM-dd");
}

export function validateExtension(type: RequestType, totalExtensionDays: number, cfg: DeadlineConfig): string | null {
  if (totalExtensionDays <= 0) return "Prelungirea trebuie să fie de cel puțin o zi.";
  if (type === "petition" && totalExtensionDays > cfg.petitionMaxExtensionDays)
    return `Petițiile se pot prelungi cu cel mult ${cfg.petitionMaxExtensionDays} zile în total.`;
  return null;
}

export type DeadlineState = "overdue" | "near" | "ok";

export function deadlineState(deadline: string, today: string, cfg: DeadlineConfig): DeadlineState {
  const left = differenceInCalendarDays(parseISO(deadline), parseISO(today));
  if (left < 0) return "overdue";
  if (left <= cfg.warnDaysBefore) return "near";
  return "ok";
}
