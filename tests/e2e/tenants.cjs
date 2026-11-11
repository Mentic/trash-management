// Multi-tenant (primării): portal, izolarea datelor, personalizarea identității. Rulat de scripts/e2e.mjs pe o bază proaspătă.
const { chromium } = require("playwright");
const OTPAuth = require("otpauth");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const B = process.env.BASE_URL ?? "http://localhost:3000";
const code = (s) => new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(s), digits: 6, period: 30, algorithm: "SHA1" }).generate();
let step = 0;
const assert = (c, msg) => { if (!c) throw new Error(`EȘUAT: ${msg}`); console.log(`✓ ${String(++step).padStart(2)} ${msg}`); };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

async function enrol(p) {
  await p.waitForURL(/\/enrol$/);
  const secret = (await p.textContent("code")).replace(/\s/g, "");
  await p.fill("#code", code(secret)); await p.click("text=Activează");
  await p.click("text=Am salvat codurile");
}

(async () => {
  const browser = await chromium.launch();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tenant-"));

  // Pagina de autentificare ADI listează portalurile
  const anon = await (await browser.newContext()).newPage();
  await anon.goto(`${B}/login`);
  assert((await anon.locator("nav[aria-labelledby=portals] a").count()) === 7, "pagina de autentificare listează cele 7 portaluri de primărie");
  const em = await anon.request.get(`${B}/api/emblem/berca`);
  assert(em.ok() && (await em.text()).includes("<svg") && em.headers()["content-security-policy"]?.includes("sandbox"), "stema stilizată se servește ca SVG, cu CSP restrictiv");

  // Portalul Berca: autentificare din pagina primăriei
  const berca = await (await browser.newContext()).newPage();
  berca.on("dialog", (d) => d.accept());
  await berca.goto(`${B}/p/berca`);
  assert((await berca.textContent("h1")).includes("Primăria Comunei Berca"), "pagina /p/berca are numele și stema primăriei");
  await berca.click("button:has-text('Primăria Comunei Berca')");
  await enrol(berca);
  await berca.waitForURL("**/portal");
  const header = await berca.textContent("header");
  assert(header.includes("Primăria Comunei Berca") && !header.includes("Registru") && !header.includes("Situație pe UAT"), "după autentificare: antetul primăriei, fără meniurile ADI");
  const main = await berca.textContent("main");
  assert(main.includes("Corespondența cu ADI") && main.includes("Contribuție AFM estimată") && !main.includes("Nehoiu"), "portalul arată datele Berca și nimic despre alte primării");

  // Izolare: parametrii din URL nu schimbă tenantul; zonele ADI sunt închise
  await berca.goto(`${B}/portal?uat=nehoiu`);
  assert((await berca.textContent("main h1")).includes("Berca"), "izolare: ?uat=nehoiu este ignorat pentru contul Berca");
  await berca.goto(`${B}/registry`);
  assert(new URL(berca.url()).pathname === "/portal", "izolare: registrul ADI redirecționează la portal");
  for (const url of ["/waste/summary", "/journal", "/tenants", "/demo"])
    assert((await berca.goto(`${B}${url}`)).status() === 404, `izolare: ${url} → 404 pentru primărie`);
  for (const url of ["/api/registry/export.csv", "/api/waste/summary.csv", "/api/demo-files/import_2026-10_scenariu_erori.csv"])
    assert((await berca.request.get(`${B}${url}`)).status() === 404, `izolare: ${url} → 404 pentru primărie`);

  // ADI (Elena): previzualizare și personalizare
  const elena = await (await browser.newContext()).newPage();
  elena.on("dialog", (d) => d.accept());
  await elena.goto(`${B}/login`);
  await elena.click("button:has-text('Elena — Director')");
  await enrol(elena);
  await elena.goto(`${B}/portal?uat=nehoiu`);
  const prev = await elena.textContent("main");
  assert(prev.includes("Primăria Orașului Nehoiu") && prev.includes("Previzualizare ADI"), "directorul ADI previzualizează portalul Nehoiu");

  await elena.goto(`${B}/tenants`);
  const card = elena.locator("li:has(h2:text-is('Primăria Comunei Berca'))");
  await card.locator("summary:has-text('Personalizează')").click();
  await card.locator("input[name=customColor]").fill("#ffeeaa");
  await card.locator("button:has-text('Salvează identitatea')").click();
  await card.locator("text=contrast").waitFor();
  assert(true, "o culoare deschisă (contrast insuficient) este refuzată, cu explicație");
  await card.locator("input[name=customColor]").fill("");
  await card.locator("label[title='Verde de brad']").click();
  await card.locator("input[name=motto]").fill("Comuna Berca — ținutul vulcanilor noroioși");
  const pngPath = path.join(tmp, "stema-berca.png"); fs.writeFileSync(pngPath, PNG);
  await card.locator("input[name=emblem]").setInputFiles(pngPath);
  await card.locator("button:has-text('Salvează identitatea')").click();
  await elena.waitForURL(/ok=berca/);
  assert((await elena.textContent("main")).includes("Identitatea Primăria Comunei Berca a fost actualizată"), "personalizarea Berca este salvată");
  const em2 = await anon.request.get(`${B}/api/emblem/berca`);
  assert(em2.headers()["content-type"] === "image/png", "stema încărcată înlocuiește stema stilizată");

  await berca.goto(`${B}/portal`);
  assert((await berca.textContent("main")).includes("ținutul vulcanilor noroioși"), "portalul Berca afișează noul text");
  const accent = await berca.evaluate(() => getComputedStyle(document.body).getPropertyValue("--accent").trim());
  assert(accent === "#2e5e3a", `portalul Berca folosește noua culoare (${accent})`);

  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nToate cele ${step} verificări multi-tenant au trecut.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
