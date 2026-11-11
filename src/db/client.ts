import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL lipsește (vezi .env.example)");

const g = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client = g.pg ?? postgres(url, { max: 10 });
if (process.env.NODE_ENV !== "production") g.pg = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
