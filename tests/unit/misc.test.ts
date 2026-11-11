import { describe, expect, it } from "vitest";
import { toRomanianCsv } from "@/domain/csv";
import { formatKgAsTonnes, parseTonnesToKg } from "@/domain/quantity";
import { computeShift, shiftDate, shiftPeriod, shiftWeighing, SeedError } from "@/domain/seedShift";
import { nextStatus, canTransition, RULES, type DocAction } from "@/domain/documentStateMachine";
import { DOC_STATUSES, ROLES, DIRECTIONS } from "@/domain/codes";

describe("cantități", () => {
  it("t ↔ kg exact", () => {
    expect(parseTonnesToKg("7,240")).toBe(7240);
    expect(parseTonnesToKg("1,2")).toBe(1200);
    expect(parseTonnesToKg("12")).toBe(12000);
    expect(parseTonnesToKg("7.240")).toBeNull();
    expect(formatKgAsTonnes(7240)).toBe("7,240");
    expect(formatKgAsTonnes(50)).toBe("0,050");
  });
});

describe("CSV (N04)", () => {
  it("BOM, ;, CRLF, ghilimele, diacritice, injecție de formule", () => {
    const csv = toRomanianCsv(["UAT", "Total (t)"], [["Comuna Vadu Pașii", "7,240"], ['a;b"c', "=1+1"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe('﻿UAT;Total (t)\r\nComuna Vadu Pașii;7,240\r\n"a;b""c";\'=1+1\r\n');
  });
});

describe("mutarea datelor demo (sec. 10)", () => {
  it("ancora devine ziua dinaintea resetării", () => {
    expect(computeShift("2026-11-10", "2026-11-11", "years")).toMatchObject({ dayShift: 0, monthShift: 0 });
    expect(computeShift("2026-11-10", "2026-12-15", "years")).toMatchObject({ dayShift: 34, monthShift: 0 });
    expect(computeShift("2026-11-10", "2026-12-15", "months")).toMatchObject({ dayShift: 34, monthShift: 1 });
  });
  it("refuză trecerea în anul următor", () => {
    expect(() => computeShift("2026-11-10", "2027-01-02", "years")).toThrow(SeedError);
  });
  it("cântăririle rămân în perioada lor", () => {
    expect(shiftDate("2026-10-06", 34)).toBe("2026-11-09");
    expect(shiftPeriod("2026-01", 1)).toBe("2026-02");
    expect(shiftWeighing("2026-01-31 09:40", 1)).toBe("2026-02-28 09:40");
  });
});

describe("mașina de stări (5.1)", () => {
  const ana = { id: "ana", role: "registrar" as const };
  const mihai = { id: "mihai", role: "officer" as const };
  const elena = { id: "elena", role: "director" as const };
  const doc = (status: (typeof DOC_STATUSES)[number], direction: (typeof DIRECTIONS)[number] = "incoming") =>
    ({ status, direction, assigneeId: "mihai" });

  it("circuitul R1–R6", () => {
    expect(nextStatus({ action: "confirm", doc: doc("draft"), actor: ana })).toBe("registered");
    expect(nextStatus({ action: "assign", doc: doc("registered"), actor: ana })).toBe("assigned");
    expect(nextStatus({ action: "startDrafting", doc: doc("assigned"), actor: mihai })).toBe("drafting");
    expect(nextStatus({ action: "submitForApproval", doc: doc("drafting"), actor: mihai })).toBe("in_approval");
    expect(nextStatus({ action: "return", doc: doc("in_approval"), actor: elena, reason: "Completați temeiul legal" })).toBe("drafting");
    expect(nextStatus({ action: "approve", doc: doc("in_approval"), actor: elena })).toBe("approved");
    expect(nextStatus({ action: "registerOutgoing", doc: doc("approved"), actor: ana })).toBe("outgoing_registered");
    expect(nextStatus({ action: "recordDispatch", doc: doc("outgoing_registered"), actor: ana })).toBe("dispatched");
    expect(nextStatus({ action: "file", doc: doc("dispatched"), actor: ana })).toBe("filed");
  });

  it("returnarea fără motiv, Mihai pe lucrarea altuia și aprobarea de către Ana sunt refuzate", () => {
    expect(canTransition({ action: "return", doc: doc("in_approval"), actor: elena })).toBe(false);
    expect(canTransition({ action: "startDrafting", doc: { ...doc("assigned"), assigneeId: "altcineva" }, actor: mihai })).toBe(false);
    expect(canTransition({ action: "approve", doc: doc("in_approval"), actor: ana })).toBe(false);
  });

  it("documentul intern se clasează din Aprobat; intrarea nu", () => {
    expect(canTransition({ action: "file", doc: doc("approved", "internal"), actor: ana })).toBe(true);
    expect(canTransition({ action: "file", doc: doc("approved", "incoming"), actor: ana })).toBe(false);
  });

  it("toate combinațiile din afara tabelului sunt refuzate", () => {
    for (const action of Object.keys(RULES) as DocAction[])
      for (const status of DOC_STATUSES)
        for (const role of ROLES) {
          const actor = { id: "mihai", role };
          const ok = canTransition({ action, doc: doc(status), actor, reason: "motiv" });
          if (ok) expect(RULES[action].from).toContain(status);
          if (ok) expect(RULES[action].roles).toContain(role);
        }
  });
});
