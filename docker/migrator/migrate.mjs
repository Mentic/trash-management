// Rulat în imaginea de producție: node migrator/migrate.mjs (folosește DATABASE_ADMIN_URL).
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_ADMIN_URL;
if (!url) throw new Error("DATABASE_ADMIN_URL lipsește");
const client = postgres(url, { max: 1 });
await migrate(drizzle(client), { migrationsFolder: "/app/src/db/migrations" });
await client.end();
console.log("migrări aplicate");
