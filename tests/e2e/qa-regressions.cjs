// Regresii pentru raportul QA din 11.11.2026 (qa/raport-probleme-2026-11-11.docx): QA01–QA04, QA06–QA07, QA09–QA11.
// Rulat de scripts/e2e.mjs pe o bază proaspătă.
const { chromium } = require("playwright");
const OTPAuth = require("otpauth");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const B = process.env.BASE_URL ?? "http://localhost:3000";
const code = (s) => new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(s), digits: 6, period: 30, algorithm: "SHA1" }).generate();
let step = 0;
const yes = (p) => p.click("[role=alertdialog] button:has-text('Da, continuă')");
const assert = (c, msg) => { if (!c) throw new Error(`EȘUAT: ${msg}`); console.log(`✓ ${String(++step).padStart(2)} ${msg}`); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qa-"));
const file = (name, content) => { const p = path.join(tmp, name); fs.writeFileSync(p, content); return p; };

async function session(browser, user, pw) {
  const p = await (await browser.newContext()).newPage();
  p.on("dialog", (d) => d.accept());
  await p.goto(`${B}/login`);
  await p.fill("#username", user); await p.fill("#password", pw); await p.click("button[type=submit]");
  await p.waitForURL(/\/enrol$/);
  const secret = (await p.textContent("code")).replace(/\s/g, "");
  await p.fill("#code", code(secret)); await p.click("text=Activează");
  await p.click("text=Am salvat codurile");
  await p.waitForURL("**/registry");
  return p;
}

(async () => {
  const browser = await chromium.launch();
  const ana = await session(browser, "ana.registrator", "Registru!2026");
  const mihai = await session(browser, "mihai.responsabil", "Deseuri!2026");
  const elena = await session(browser, "elena.director", "Aprobare!2026");

  // QA02 + QA10: ciornă cu anexă
  await ana.goto(`${B}/registry/new`);
  await ana.fill("#correspondentName", "Test QA (fictiv)");
  await ana.fill("#subject", "Ciornă QA");
  await ana.setInputFiles("#files", file("qa-draft.txt", "continut ciorna"));
  await ana.click("button:has-text('Salvează ciorna')");
  await ana.waitForURL(/ok=draft/);
  const draftUrl = ana.url().split("?")[0];
  const attHref = await ana.getAttribute("a[href^='/api/attachments/']", "href");
  assert((await (await elena.request.get(`${B}${attHref}`)).status()) === 404, "QA02: Elena nu poate descărca anexa unei ciorne (404, ca fișa)");
  assert((await (await elena.goto(draftUrl)).status()) === 404, "QA02: Elena nu vede fișa ciornei (404)");
  await ana.goto(draftUrl);
  await ana.fill("#d-subject", "Ciornă QA — corectată înainte de confirmare");
  await ana.click("button:has-text('Salvează ciorna')");
  await ana.waitForURL(/ok=draft/);
  assert((await ana.textContent("main")).includes("Ciornă QA — corectată înainte de confirmare"), "QA10: ciorna se poate edita înainte de confirmare");

  // QA03: dovada de expediere = fișierul încărcat acum
  await ana.goto(`${B}/registry/new`);
  await ana.check("input[name=direction][value=outgoing]");
  await ana.fill("#correspondentName", "AFM");
  await ana.fill("#subject", "Ieșire QA03");
  await ana.setInputFiles("#files", file("qa-old.txt", "anexa veche"));
  await ana.click("text=Confirmă și atribuie număr"); await yes(ana);
  await ana.waitForURL(/ok=confirmed/);
  await ana.fill("#proofRef", "");
  await ana.setInputFiles("#proofFile", file("qa-proof.txt", "dovada"));
  await ana.click("button:has-text('Consemnează expedierea')");
  await ana.waitForURL(/ok=dispatched/);
  const sent = await ana.textContent("section[aria-label=Expediere]");
  assert(sent.includes("qa-proof.txt") && !sent.includes("qa-old.txt"), "QA03: expedierea indică fișierul de dovadă încărcat, nu prima anexă");

  // QA01, QA04, QA09: import cu o cursă 2025 fără UAT, o dată imposibilă și o cantitate uriașă
  const head = "perioada;data_cantaririi;nr_tichet;nr_auto;operator_cui;uat_siruta;ruta_comuna;uat_ruta;cod_ler;fractie;destinatie_tip;instalatie_destinatie;cantitate_raportata_t;cantitate_tichet_t;document_justificativ";
  const csv = "﻿" + [head,
    "2025-12;2025-12-20 09:00;T-QA-0001;DEMO-04;99999901;;Nu;;20 03 01;reziduale;depozitare;Depozit conform (fictiv);1,000;1,000;AV-QA-1",
    "2026-10;2026-10-32 10:00;T-QA-0002;DEMO-04;99999901;900004;Nu;;20 03 01;reziduale;depozitare;Depozit conform (fictiv);1,000;1,000;AV-QA-2",
    "2026-10;2026-10-15 10:00;T-QA-0003;DEMO-04;99999901;900004;Nu;;20 03 01;reziduale;depozitare;Depozit conform (fictiv);99999999,000;;AV-QA-3",
    "2026-10;2026-10-15 11:00;T-QA-0004;DEMO-04;99999901;900004;Nu;;20 03 01;reziduale;depozitare;Depozit conform (fictiv);1,000;1,000;AV-QA-4",
  ].join("\r\n") + "\r\n";
  await mihai.goto(`${B}/waste/imports`);
  await mihai.selectOption("#documentId", { index: 1 });
  await mihai.setInputFiles("#file", file("qa.csv", csv));
  await mihai.click("button:has-text('Importă și verifică')");
  await mihai.waitForURL(/\/waste\/imports\/[0-9a-f-]{36}$/);
  const importUrl = mihai.url();
  const t = await mihai.textContent("main");
  assert(t.includes("T-QA-0002") && t.includes("dată sau oră inexistentă"), "QA04: data 2026-10-32 este respinsă V1, cu motiv");
  assert(t.includes("T-QA-0003") && t.includes("valoare nerealistă"), "QA09: cantitatea uriașă este respinsă V1, fără eroare internă");

  const row = mihai.locator("tr:has-text('T-QA-0001')");
  await row.locator("summary:has-text('Atribuie UAT')").click();
  const form = row.locator("details[open]:has(select[name=uatId])");
  await form.locator("select[name=uatId]").selectOption({ label: "Comuna Berca" });
  await form.locator("input[name=evidenceRef]").fill("Foaie de parcurs QA");
  await form.locator("input[name=reason]").fill("Test QA01");
  await form.locator("button[type=submit]").click();
  await mihai.waitForSelector("text=Anul 2025 este aprobat pentru Comuna Berca");
  assert(true, "QA01: atribuirea unei curse 2025 la o UAT cu anul aprobat este refuzată");
  await elena.goto(`${B}/waste/uats?year=2025`);
  assert((await elena.textContent("[data-testid=afm-result]")).includes("14.923"), "QA01: estimarea AFM Berca 2025 rămâne 14.923 lei");

  // QA11: contoarele importului nu depind de filtru
  await mihai.goto(importUrl);
  await mihai.click("button:has-text('Validează rândurile curate')"); await yes(mihai);
  await mihai.waitForURL(/ok=validated/);
  await mihai.goto(`${importUrl}?filter=flagged`);
  assert((await mihai.textContent("main")).includes("1 validate"), "QA11: cu filtrul „Doar semnalate”, sumarul arată totuși rândurile validate");

  // QA06 + QA07: cronometrul de inactivitate (ceas simulat în browser)
  const p2 = await ana.context().newPage();
  await p2.clock.install();
  await p2.goto(`${B}/registry/new`);
  await p2.waitForSelector("html[data-session-timer=ready]", { state: "attached" }); // după hidratare
  await p2.clock.fastForward("20:00");
  await p2.fill("#subject", "Text scris în formular");
  await p2.clock.fastForward("10:00");
  assert(!(await p2.locator("text=Sesiunea expiră în curând").isVisible()), "QA06: tastarea în formular amână avertizarea de expirare");
  await p2.clock.fastForward("18:30"); // 10 + 18,5 = 28,5 min de la ultima tastare
  await p2.waitForSelector("text=Sesiunea expiră în curând");
  await p2.clock.runFor(200); // ceasul simulat: lasă Radix să mute focusul în dialog
  const focusIn = () => p2.evaluate(() => !!document.activeElement?.closest("[role=alertdialog]"));
  let inside = await focusIn();
  for (let i = 0; i < 4; i++) { await p2.keyboard.press("Tab"); await p2.clock.runFor(50); inside = inside && (await focusIn()); }
  assert(inside, "QA07: focusul rămâne în dialogul de expirare (Tab nu iese)");
  await p2.click("button:has-text('Prelungește sesiunea')");
  await p2.waitForSelector("text=Sesiunea expiră în curând", { state: "hidden" });
  await p2.close();

  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nToate cele ${step} verificări QA au trecut.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
