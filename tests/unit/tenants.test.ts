import { describe, expect, it } from "vitest";
import { contrastWithWhite, crownTowers, isValidBrandColor, slugify, TENANT_PALETTE, townHallName, uatNameFromTownHall } from "@/domain/tenants";
import { emblemSvg } from "@/lib/emblem";

describe("multi-tenant (primării)", () => {
  it("slug și numele primăriei", () => {
    expect(slugify("Comuna Vadu Pașii")).toBe("vadu-pasii");
    expect(slugify("Municipiul Râmnicu Sărat")).toBe("ramnicu-sarat");
    expect(uatNameFromTownHall("Primăria Comunei Berca")).toBe("Comuna Berca");
    expect(uatNameFromTownHall("Primăria Municipiului Râmnicu Sărat")).toBe("Municipiul Râmnicu Sărat");
    expect(uatNameFromTownHall("APM Buzău")).toBeNull();
    expect(townHallName("Orașul Nehoiu")).toBe("Primăria Orașului Nehoiu");
  });
  it("paleta are contrast ≥ 4,5:1 cu textul alb (A04); culorile deschise sunt refuzate", () => {
    for (const c of TENANT_PALETTE) expect(contrastWithWhite(c.hex), c.name).toBeGreaterThanOrEqual(4.5);
    expect(isValidBrandColor("#ffeeaa")).toBe(false);
    expect(isValidBrandColor("#8c1c2c")).toBe(true);
  });
  it("coroana murală: municipiu 5, oraș 3, comună 1 turn; SVG sigur", () => {
    expect([crownTowers("municipiu"), crownTowers("oraș"), crownTowers("comună")]).toEqual([5, 3, 1]);
    const svg = emblemSvg({ name: 'Comuna <x>"', kind: "comună", color: "#2e5e3a" });
    expect(svg).not.toContain("<x>");
    expect(svg.match(/v-12 h3/g)).toHaveLength(1);
  });
});
