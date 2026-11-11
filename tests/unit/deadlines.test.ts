import { describe, expect, it } from "vitest";
import { computeDeadline, deadlineState, validateExtension, DEMO_DEADLINES as C } from "@/domain/deadlines";

describe("termene (R04)", () => {
  it("petiție +30, informații publice +10, redirecționat +5, raport operator fără termen", () => {
    expect(computeDeadline("2026-11-10", "petition", {}, C)).toBe("2026-12-10");
    expect(computeDeadline("2026-11-10", "public_info", {}, C)).toBe("2026-11-20");
    expect(computeDeadline("2026-11-10", "petition", { redirected: true }, C)).toBe("2026-11-15");
    expect(computeDeadline("2026-11-10", "operator_report", {}, C)).toBeNull();
  });
  it("prelungirea petițiilor: 15 zile OK, 16 refuzat", () => {
    expect(validateExtension("petition", 15, C)).toBeNull();
    expect(validateExtension("petition", 16, C)).not.toBeNull();
  });
  it("indicator: aproape la 5 zile, nu la 6; depășit după termen", () => {
    expect(deadlineState("2026-11-15", "2026-11-10", C)).toBe("near");
    expect(deadlineState("2026-11-16", "2026-11-10", C)).toBe("ok");
    expect(deadlineState("2026-11-09", "2026-11-10", C)).toBe("overdue");
  });
});
