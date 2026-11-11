// R06, numerotare 1–7 (sec. 5.2): alocare atomică, în tranzacția care confirmă documentul.
import { sql } from "drizzle-orm";
import type { Tx } from "./client";

export async function allocateRegistryNumber(tx: Tx, year: number): Promise<number> {
  const rows = await tx.execute<{ last_number: number }>(sql`
    INSERT INTO registry_counters (year, last_number) VALUES (${year}, 1)
    ON CONFLICT (year) DO UPDATE SET last_number = registry_counters.last_number + 1
    RETURNING last_number`);
  const n = rows[0]?.last_number;
  if (n === undefined) throw new Error("registry counter allocation failed");
  return n;
}
