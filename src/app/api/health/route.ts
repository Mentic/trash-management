import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Kit demo: verificare rapidă înainte de întâlnire (sec. 7, 14).
export async function GET() {
  let dbStatus = "unknown";
  try {
    const { db } = await import("@/db/client");
    await db.execute(sql`select 1`);
    dbStatus = "ok";
  } catch {
    dbStatus = "error";
  }
  return Response.json(
    { db: dbStatus, mode: process.env.APP_MODE ?? "demo", version: process.env.APP_VERSION ?? "dev" },
    { status: dbStatus === "ok" ? 200 : 503 },
  );
}
