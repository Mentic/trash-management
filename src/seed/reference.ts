// Sec. 10 (parțial): conturile demo și datele de referință. Documentele și cursele urmează în loader-ul complet.
import { readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { annualParameters, dossiers, operators, registryCounters, settings, uats, users } from "@/db/schema";
import { SEED_ROLE } from "@/domain/codes";
import { DEMO_DEADLINES } from "@/domain/deadlines";
import { DEMO_ELIGIBLE } from "@/domain/waste/afm";
import { hashSecret } from "@/server/auth/password";

const SEED_DIR = path.join(process.cwd(), "seed");
const json = <T>(name: string): T => JSON.parse(readFileSync(path.join(SEED_DIR, name), "utf-8")) as T;

interface SeedUser { utilizator: string; nume: string; rol: string; parola_demo: string }
interface SeedUat { siruta_demo: string; denumire: string; tip: "municipiu" | "oraș" | "comună"; mediu: "urban" | "rural"; populatie_rpl2021: number; serviciu_salubrizare_organizat: boolean; cantitate_contractata_t_an: number }
interface SeedParams { procent_anexa6: Record<string, number>; tinte_reciclare: Record<string, number>; indici_generare_t_loc_an: { urban: number; rural: number }; contributie_afm_lei_t: number; toleranta_diferenta_t: number }

export async function loadReference(db: PostgresJsDatabase<Record<string, unknown>>) {
  const p = json<SeedParams>("parametri.json");
  const docs = json<{ nr: number; an: number }[]>("documente_2026.json");

  await db.transaction(async (tx) => {
    for (const u of json<SeedUser[]>("utilizatori.json")) {
      await tx.insert(users).values({
        username: u.utilizator,
        displayName: u.nume,
        role: SEED_ROLE[u.rol]!,
        passwordHash: await hashSecret(u.parola_demo),
      });
    }
    await tx.insert(dossiers).values(
      json<{ indicativ: string; denumire: string; termen_pastrare: string }[]>("nomenclator.json").map((d) => ({
        code: d.indicativ, title: d.denumire, retention: d.termen_pastrare,
      })),
    );
    await tx.insert(uats).values(
      json<SeedUat[]>("uat.json").map((u) => ({
        siruta: u.siruta_demo, sirutaSource: "demo", name: u.denumire, kind: u.tip, environment: u.mediu,
        population: u.populatie_rpl2021, organizedService: u.serviciu_salubrizare_organizat,
        contractedQtyKg: Math.round(u.cantitate_contractata_t_an * 1000),
      })),
    );
    await tx.insert(operators).values({ cui: "99999901", name: "Operator de colectare (fictiv)" });
    for (const [year, pct] of Object.entries(p.procent_anexa6)) {
      await tx.insert(annualParameters).values({
        year: Number(year), annex6Pct: String(pct), recyclingTargetPct: String(p.tinte_reciclare["2025"] ?? 55),
        toleranceKg: Math.round(p.toleranta_diferenta_t * 1000), afmRateLeiPerT: p.contributie_afm_lei_t,
      });
    }
    const set = (key: string, value: unknown) => ({ key, value });
    await tx.insert(settings).values([
      set("registry.mode", "single_annual"), // I01
      set("registry.reply_numbering", "new_number"), // I02
      set("deadlines", DEMO_DEADLINES), // I03
      set("afm.qmun_basis", "all_validated_rows"), // I06
      set("waste.shared_route_policy", "evidence_or_director_rule"), // I09
      set("afm.unorganized_kg_per_capita", { urban: 233, rural: 105 }), // I11
      set("afm.eligible_destinations", DEMO_ELIGIBLE), // I12
      set("payt.fee_calculation_enabled", false), // I13
      set("auth.mfa_required", true), // I14
      set("afm.generation_index_t_per_capita", p.indici_generare_t_loc_an), // I16
    ]);
    // R06: setul demo se termină la 120/2026 → următoarea confirmare primește 121/2026.
    const maxNr = Math.max(...docs.map((d) => d.nr));
    await tx.insert(registryCounters).values({ year: docs[0]!.an, lastNumber: maxNr });
    await tx.execute(sql`select 1`);
  });
}
