import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type { RawRow } from "@/domain/waste/importRules";

export const SEED_DIR = path.resolve(__dirname, "../../seed");
export const readJson = <T>(name: string): T => JSON.parse(readFileSync(path.join(SEED_DIR, name), "utf-8")) as T;
export const readCsv = (name: string): RawRow[] =>
  parse(readFileSync(path.join(SEED_DIR, name)), { delimiter: ";", bom: true, columns: true, trim: true }) as RawRow[];
