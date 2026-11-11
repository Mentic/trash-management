// La pornirea serverului: migrări (rol app_admin), apoi datele demo dacă baza este goală.
import path from "node:path";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { users } from "@/db/schema";
import { loadReference } from "./reference";

export async function bootstrap() {
  const url = process.env.DATABASE_ADMIN_URL;
  if (!url) {
    console.warn("[bootstrap] DATABASE_ADMIN_URL lipsește: sar peste migrări și datele demo");
    return;
  }
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "src/db/migrations") });
    const [row] = await db.select({ n: count() }).from(users);
    if ((process.env.APP_MODE ?? "demo") === "demo" && row?.n === 0) {
      await loadReference(db);
      console.log("[bootstrap] conturile demo și datele de referință au fost încărcate");
    }
  } finally {
    await client.end();
  }
}
