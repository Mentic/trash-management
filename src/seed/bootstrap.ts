// La pornirea serverului: migrări (rol app_admin), apoi datele demo dacă baza este goală.
import path from "node:path";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { documents, users } from "@/db/schema";
import { seedAll } from "./reset";
import { ensureTenants } from "./tenants";

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
    if ((process.env.APP_MODE ?? "demo") !== "demo") return;
    const [u] = await db.select({ n: count() }).from(users);
    const [d] = await db.select({ n: count() }).from(documents);
    if (u?.n === 0 || d?.n === 0) {
      // Baza goală sau doar cu conturile (versiunea anterioară): încarcă setul complet, păstrând înrolările 2FA.
      const shift = await seedAll({ truncate: (u?.n ?? 0) > 0, keepMfa: true });
      console.log(`[bootstrap] set demo încărcat (ancora mutată la ${shift.target})`);
    }
    await ensureTenants(db); // multi-tenant: completează primăriile și pe bazele mai vechi
  } finally {
    await client.end();
  }
}
