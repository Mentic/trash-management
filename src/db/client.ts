import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// postgres-js se conectează abia la prima interogare, deci build-ul (fără .env) nu are nevoie de bază.
const url = process.env.DATABASE_URL ?? "postgres://lipseste-DATABASE_URL@127.0.0.1:1/adi";

const g = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client = g.pg ?? postgres(url, { max: 10 });
if (process.env.NODE_ENV !== "production") g.pg = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
