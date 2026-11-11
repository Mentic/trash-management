// Scenariile de acceptare din BRD pe setul demo proaspăt: R1–R8, D1–D5, D7 (+ L1–L2 pentru fiecare cont).
// Rulat de scripts/e2e.mjs (pnpm test:e2e); manual: BASE_URL=http://localhost:3000 node tests/e2e/demo-scenarios.cjs pe o bază resetată.
const { chromium } = require("playwright");
const OTPAuth = require("otpauth");
const path = require("node:path");
const B = process.env.BASE_URL ?? "http://localhost:3000";
const SEED = path.join(__dirname, "../../seed");
const code = (s, t = Date.now()) => new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(s), digits: 6, period: 30, algorithm: "SHA1" }).generate({ timestamp: t });
let step = 0;
const ok = (msg) => console.log(`✓ ${String(++step).padStart(2)} ${msg}`);
const assert = (c, msg) => { if (!c) throw new Error(`EȘUAT: ${msg}`); ok(msg); };

async function session(browser, user, pw) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  p.on("dialog", (d) => d.accept());
  await p.goto(`${B}/login`);
  await p.fill("#username", user); await p.fill("#password", pw); await p.click("button[type=submit]");
  await p.waitForURL(/\/(enrol|2fa)$/);
  const secret = (await p.textContent("code")).replace(/\s/g, "");
  await p.fill("#code", code(secret)); await p.click("text=Activează");
  await p.click("text=Am salvat codurile");
  await p.waitForURL("**/registry");
  return p;
}
const text = (p) => p.textContent("main");

(async () => {
  const browser = await chromium.launch();
  const ana = await session(browser, "ana.registrator", "Registru!2026");
  const mihai = await session(browser, "mihai.responsabil", "Deseuri!2026");
  const elena = await session(browser, "elena.director", "Aprobare!2026");
  ok("L1–L2: cele trei conturi înrolate cu cod QR");
  assert((await ana.textContent("body")).includes("DEMO — date fictive"), "marcajul DEMO — date fictive este afișat");
  assert((await text(ana)).includes("120 documente"), "registrul are cele 120 de documente din setul demo");

  // R1
  await ana.goto(`${B}/registry/new`);
  await ana.selectOption("#requestType", "petition");
  await ana.fill("#correspondentName", "Ion Popescu (fictiv)");
  await ana.fill("#externalRef", "438/2026");
  await ana.fill("#subject", "Sesizare privind ridicarea deșeurilor voluminoase");
  const hint = await ana.textContent("text=Termen calculat");
  await ana.click("text=Confirmă și atribuie număr");
  await ana.waitForURL(/\/registry\/[0-9a-f-]{36}$/);
  const inUrl = ana.url();
  assert((await ana.textContent("h1")).includes("121/2026"), "R1: adresa 438/2026 înregistrată ca intrarea 121/2026");
  const expected = new Date(Date.now() + 30 * 864e5).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" });
  assert((await text(ana)).includes(expected) && hint.includes(expected), `R1: termenul petiției = data înregistrării + 30 de zile (${expected})`);

  // R2
  await ana.selectOption("#assigneeId", { label: "Mihai (fictiv)" });
  await ana.click("button:has-text('Repartizează')");
  await ana.waitForSelector("text=Responsabil: Mihai (fictiv)");
  await mihai.goto(`${B}/registry?q=121/2026`);
  assert((await text(mihai)).includes("121/2026"), "R2: lucrarea apare în lista lui Mihai");
  await ana.goto(`${B}/registry?assignee=none`);
  const foreign = await ana.getAttribute("tbody a", "href");
  const r = await mihai.goto(`${B}${foreign}`);
  assert(r.status() === 404, "R2/R7: o lucrare nerepartizată nu se deschide pentru Mihai prin link direct (404)");
  const exp = await mihai.request.get(`${B}/api/registry/export.csv`);
  const expText = await exp.text();
  assert(!expText.includes(foreign.split("/").pop()) && expText.split("\r\n").filter(Boolean).length < 120, "R07: exportul lui Mihai conține doar lucrările sale");

  // R3
  await mihai.goto(inUrl);
  await mihai.fill("#replyDraft", "Vă rugăm să precizați adresa exactă și data la care deșeurile nu au fost ridicate.");
  await mihai.check("input[name=intent][value=submit]");
  await mihai.click("button:has-text('Salvează')");
  await mihai.waitForSelector("text=În aprobare");
  ok("R3: Mihai redactează cererea de clarificări și o trimite la aprobare");

  // R4
  await elena.goto(inUrl);
  await elena.click("summary:has-text('Returnează cu motiv')");
  await elena.fill("details[open] textarea[name=reason]", "Completați temeiul legal");
  await elena.click("details[open] button[type=submit]");
  await elena.waitForSelector("main >> text=În redactare");
  await mihai.goto(inUrl);
  await mihai.fill("#replyDraft", "Conform OG 27/2002, vă rugăm să precizați adresa exactă și data la care deșeurile nu au fost ridicate.");
  await mihai.check("input[name=intent][value=submit]");
  await mihai.click("button:has-text('Salvează')");
  await mihai.waitForSelector("text=În aprobare");
  await elena.goto(inUrl);
  await elena.click("button:has-text('Aprobă răspunsul')");
  await elena.waitForSelector("main >> text=Aprobat");
  assert((await text(elena)).includes("Completați temeiul legal"), "R4: returnat cu motiv, corectat, retrimis și aprobat; motivul apare în istoric");

  // R5
  await ana.goto(inUrl);
  await ana.click("button:has-text('Înregistrează ieșirea')");
  await ana.waitForSelector("text=Ieșire 122/2026");
  ok("R5: ieșirea 122/2026, legată de intrarea 121/2026");
  await ana.selectOption("#channel", "email");
  await ana.fill("#proofRef", "confirmare-e-mail-0121 (simulată)");
  await ana.click("button:has-text('Consemnează expedierea')");
  await ana.waitForSelector("text=confirmare-e-mail-0121");
  assert((await text(ana)).includes("Expediat"), "R5/R09: expedierea prin e-mail cu dovadă simulată apare în fișă");

  // R6
  const dossierLabel = "I-1 — Corespondență cu UAT-urile membre";
  await ana.selectOption("#dossierId", { label: dossierLabel });
  await ana.click("button:has-text('Clasează la dosar')");
  await ana.waitForSelector("text=Documentul este închis");
  await ana.click("text=Ieșire 122/2026");
  await ana.waitForSelector("h1:has-text('122/2026')");
  await ana.selectOption("#dossierId", { label: dossierLabel });
  await ana.click("button:has-text('Clasează la dosar')");
  await ana.waitForSelector("text=Documentul este închis");
  ok("R6: ambele documente clasate în dosarul I-1 (dosar obligatoriu)");

  // R7
  await ana.goto(`${B}/registry?q=438/2026`);
  const t7 = await text(ana);
  assert(t7.includes("121/2026") && t7.includes("122/2026"), "R7: căutarea după 438/2026 găsește intrarea și răspunsul");
  const csv = await (await ana.request.get(`${B}/api/registry/export.csv?q=438/2026`)).text();
  assert(csv.charCodeAt(0) === 0xfeff && csv.split("\r\n").filter(Boolean).length === 3 && csv.includes(";"), "R08/N04: exportul CSV (BOM, „;”) conține exact rândurile filtrate");

  // R8
  await ana.goto(inUrl);
  await ana.click("summary:has-text('Corectează metadatele')");
  await ana.fill("#c-subject", "Sesizare privind ridicarea deșeurilor voluminoase din str. Florilor");
  await ana.fill("details[open] textarea[name=reason]", "Precizare adresă la cererea petentului");
  await ana.click("details[open] button[type=submit]");
  await ana.waitForSelector("del:has-text('Sesizare privind ridicarea')");
  assert((await text(ana)).includes("Precizare adresă la cererea petentului"), "R8/R02: corecția păstrează valoarea veche și nouă, autorul, data și motivul");

  // D1
  await ana.goto(`${B}/registry/new`);
  await ana.selectOption("#requestType", "operator_report");
  await ana.fill("#correspondentName", "Operator de colectare (fictiv)");
  await ana.fill("#subject", "Raport lunar de activitate – octombrie 2026");
  await ana.click("text=Confirmă și atribuie număr");
  await ana.waitForURL(/\/registry\/[0-9a-f-]{36}$/);
  assert((await ana.textContent("h1")).includes("123/2026"), "D1: raportul pe octombrie înregistrat ca intrarea 123/2026");
  await ana.selectOption("#dossierId", { label: "II-1 — Rapoarte lunare ale operatorilor" });
  await ana.click("button:has-text('Clasează fără răspuns')");
  await ana.waitForSelector("text=Documentul este închis");
  ok("D1: clasat fără răspuns în II-1");

  // D2–D3
  await mihai.goto(`${B}/waste/imports`);
  await mihai.selectOption("#documentId", { label: "123/2026 — Raport lunar de activitate – octombrie 2026" });
  await mihai.setInputFiles("#file", path.join(SEED, "import_2026-10_scenariu_erori.csv"));
  await mihai.click("button:has-text('Importă și verifică')");
  await mihai.waitForURL(/\/waste\/imports\/[0-9a-f-]{36}$/);
  const stat = async (label) => Number((await mihai.locator(`div.rounded.border:has(div:text-is("${label}")) >> div.text-lg`).textContent()).trim());
  const s = { total: await stat("Rânduri în fișier"), v1: await stat("Respinse (V1, V6)"), v2: await stat("Duplicat (V2)"), v3: await stat("Diferență (V3)"), v4: await stat("Neatribuit (V4)"), clean: await stat("Importate fără semnalări") };
  assert(JSON.stringify(s) === JSON.stringify({ total: 26, v1: 1, v2: 1, v3: 1, v4: 1, clean: 22 }), `D3: raportul de import ${JSON.stringify(s)}`);
  assert((await text(mihai)).includes("T-2026-002539") && (await text(mihai)).includes("cod_ler: format NN NN NN"), "D3: rândul respins V1 apare cu motiv");

  // D4
  const dupRow = mihai.locator("tr:has-text('V2 Duplicat')");
  await dupRow.locator("summary:has-text('Exclude')").click();
  await dupRow.locator("button:has-text('Exclude din calcul')").click();
  await mihai.waitForSelector("tr:has-text('T-2026-002535') >> text=Exclus");
  const diffRow = mihai.locator("tr:has-text('T-2026-002543')");
  await diffRow.locator("summary:has-text('Corectează')").click();
  await diffRow.locator("button:has-text('Salvează corecția')").click();
  await mihai.waitForSelector("tr:has-text('T-2026-002543') >> text=Importat");
  await mihai.click("button:has-text('Validează rândurile curate')");
  await mihai.waitForSelector("text=rânduri validate");
  const t4 = await text(mihai);
  assert(/23 validate/.test(t4) && t4.includes("1 semnalate") && t4.includes("1 excluse"), "D4: duplicat exclus, diferență corectată după tichet, 23 de rânduri validate; ruta comună rămâne semnalată");

  // D5
  await elena.goto(`${B}/waste/summary?year=2026`);
  await elena.click("tr:has-text('Comuna Berca') >> a");
  await elena.waitForURL(/\/waste\/summary\/[0-9a-f-]{36}\?/);
  await elena.click("a:has-text('octombrie 2026')");
  await elena.waitForURL(/period=\d{4}-10/);
  await elena.click("tbody a >> nth=0");
  await elena.waitForSelector("h1:has-text('Tichet de cântar')");
  assert((await text(elena)).includes("intrarea 123/2026"), "D5: totalul Berca se deschide până la tichet și la raportul din registratură");
  await elena.goto(`${B}/waste/rows?bucket=unassigned&year=2026`);
  assert((await text(elena)).includes("T-2026-002534"), "D5: cursa pe rută comună apare separat, în afara totalurilor");
  const sc = await (await elena.request.get(`${B}/api/waste/summary.csv?year=2026`)).text();
  assert(sc.charCodeAt(0) === 0xfeff && sc.includes("Comuna Berca") && sc.includes("Neatribuite"), "D5/N04: exportul centralizatorului (BOM, diacritice, categorii separate)");

  // D7
  await elena.goto(`${B}/waste/uats?year=2025`);
  const afm = await elena.textContent("[data-testid=afm-result]");
  const t7b = await text(elena);
  assert(afm.replace(/\s/g, " ").includes("14.923 lei") && t7b.includes("25 ianuarie 2026") && t7b.includes("DEMO — date fictive"),
    `D7: estimarea AFM Comuna Berca 2025 = ${afm.trim()}, cu formula, intrările și termenul de 25 ianuarie`);

  // S08
  await elena.goto(`${B}/journal?category=security`);
  assert((await text(elena)).includes("auth.mfa_enrolled"), "S08: înrolările apar în jurnalul de securitate");
  if (process.env.SHOTS) {
    const shot = async (p, url, name) => { await p.goto(`${B}${url}`); await p.screenshot({ path: `${process.env.SHOTS}/${name}.png`, fullPage: true }); };
    await shot(ana, "/registry", "1-registru");
    await shot(ana, new URL(inUrl).pathname, "2-fisa-121");
    await shot(mihai, new URL(mihai.url()).pathname === "/" ? "/waste/imports" : "/waste/imports", "3-importuri");
    await shot(elena, "/waste/summary?year=2026", "4-situatie-uat");
    await shot(elena, "/waste/uats?year=2025", "5-afm");
  }

  // N08 — resetarea din Kit demo, cu păstrarea înrolărilor 2FA
  await elena.goto(`${B}/demo`);
  await elena.fill("#confirm", "RESETEAZĂ");
  await elena.click("button:has-text('Resetează datele demo')");
  await elena.waitForURL("**/login", { timeout: 60000 });
  await elena.fill("#username", "elena.director"); await elena.fill("#password", "Aprobare!2026"); await elena.click("button[type=submit]");
  await elena.waitForURL("**/2fa");
  ok("N08: resetarea reîncarcă setul și păstrează înrolarea 2FA (Elena ajunge direct la cod, fără QR)");
  await browser.close();
  console.log(`\nToate cele ${step} verificări au trecut.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
