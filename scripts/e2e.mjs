// Teste end-to-end pe build-ul de producție (standalone), fiecare pe o bază proaspătă:
//   1. tests/e2e/auth-smoke.cjs      — L1–L5 (conturi neînrolate)
//   2. tests/e2e/demo-scenarios.cjs  — L1–L2, R1–R8, D1–D5, D7, S08, N08
//   3. tests/e2e/qa-regressions.cjs  — raportul QA din 11.11.2026
//   4. tests/e2e/tenants.cjs         — multi-tenant (portalurile primăriilor)
// Doar Node (fără psql/curl/openssl), ca să ruleze și în imaginea oficială Playwright din CI.
// Necesită: `pnpm build`, PostgreSQL accesibil, PG_ADMIN_BASE (ex. postgres://app_admin:parola@localhost:5432)
// și APP_RW_PASSWORD (rolul app_rw se creează dacă lipsește). Opțional: PORT (implicit 3100).
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import postgres from "postgres";

const root = path.resolve(import.meta.dirname, "..");
const { PG_ADMIN_BASE, APP_RW_PASSWORD, PORT = "3100" } = process.env;
if (!PG_ADMIN_BASE || !APP_RW_PASSWORD) {
  console.error("Setați PG_ADMIN_BASE (ex. postgres://app_admin:parola@localhost:5432) și APP_RW_PASSWORD.");
  process.exit(1);
}
const S = path.join(root, ".next/standalone");
if (!existsSync(path.join(S, "server.js"))) {
  console.error("Rulați întâi: pnpm build");
  process.exit(1);
}
for (const [from, to] of [[".next/static", ".next/static"], ["src/db/migrations", "src/db/migrations"], ["seed", "seed"]]) {
  rmSync(path.join(S, to), { recursive: true, force: true });
  cpSync(path.join(root, from), path.join(S, to), { recursive: true });
}

const hostPort = PG_ADMIN_BASE.slice(PG_ADMIN_BASE.lastIndexOf("@") + 1);
const admin = postgres(`${PG_ADMIN_BASE}/postgres`, { max: 1, onnotice: () => {} });
const pw = APP_RW_PASSWORD.replace(/'/g, "''");
await admin.unsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw')
  THEN CREATE ROLE app_rw LOGIN PASSWORD '${pw}'; END IF; END $$`);

const tmp = mkdtempSync(path.join(tmpdir(), "adi-e2e-"));
const baseEnv = {
  ...process.env,
  TOTP_ENC_KEY: randomBytes(32).toString("base64"),
  SESSION_PEPPER: randomBytes(32).toString("base64"),
  APP_MODE: "demo",
  DEMO_RESET_ENABLED: "true",
  NEXT_TELEMETRY_DISABLED: "1",
  PORT,
  HOSTNAME: "127.0.0.1",
};
const base = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (cmd, args, opts) => new Promise((res) => spawn(cmd, args, { stdio: "inherit", ...opts }).on("exit", (c) => res(c ?? 1)));

async function suite(db, test) {
  await admin.unsafe(`DROP DATABASE IF EXISTS ${db} WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE ${db}`);
  await admin.unsafe(`GRANT CONNECT ON DATABASE ${db} TO app_rw`);
  const files = path.join(tmp, `files-${db}`);
  const log = path.join(tmp, `${db}.log`);
  writeFileSync(log, "");
  const server = spawn("node", ["server.js"], {
    cwd: S,
    env: { ...baseEnv, DATABASE_URL: `postgres://app_rw:${encodeURIComponent(APP_RW_PASSWORD)}@${hostPort}/${db}`, DATABASE_ADMIN_URL: `${PG_ADMIN_BASE}/${db}`, FILE_STORAGE_DIR: files },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = [];
  server.stdout.on("data", (d) => out.push(d));
  server.stderr.on("data", (d) => out.push(d));
  const dump = () => console.error(`--- log server (${db}) ---\n${Buffer.concat(out).toString().split("\n").slice(-60).join("\n")}`);
  try {
    let up = false;
    for (let i = 0; i < 90 && !up; i++) {
      up = await fetch(`${base}/api/health`).then((r) => r.ok, () => false);
      if (!up) await sleep(1000);
    }
    if (!up) { dump(); throw new Error(`serverul nu a pornit (${db})`); }
    const code = await run("node", [path.join(root, test)], { env: { ...process.env, BASE_URL: base } });
    if (code !== 0) { dump(); throw new Error(`${test} a eșuat`); }
  } finally {
    server.kill();
    await new Promise((r) => (server.exitCode !== null ? r() : server.on("exit", r)));
  }
}

try {
  await suite("adi_e2e_auth", "tests/e2e/auth-smoke.cjs");
  await suite("adi_e2e_demo", "tests/e2e/demo-scenarios.cjs");
  await suite("adi_e2e_qa", "tests/e2e/qa-regressions.cjs");
  await suite("adi_e2e_tenants", "tests/e2e/tenants.cjs");
  console.log("E2E: toate testele au trecut.");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await admin.end();
  rmSync(tmp, { recursive: true, force: true });
}
