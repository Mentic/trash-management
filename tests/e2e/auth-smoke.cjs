// L1–L5 pe o bază proaspătă (conturi neînrolate): node tests/e2e/auth-smoke.cjs (BASE_URL implicit http://localhost:3000).
// Necesită playwright instalat global sau în proiect. Va fi mutat în suita Playwright din sec. 11.
const { chromium } = require('playwright');
const OTPAuth = require('otpauth');
const B = process.env.BASE_URL ?? 'http://localhost:3000';
const code = (s, t = Date.now()) => new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(s), digits: 6, period: 30, algorithm: 'SHA1' }).generate({ timestamp: t });
const login = async (p, u, pw) => { await p.goto(B + '/login'); await p.fill('#username', u); await p.fill('#password', pw); await p.click('button[type=submit]'); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  // L1–L2: Ana, înrolare
  await login(p, 'ana.registrator', 'Registru!2026'); await p.waitForURL('**/enrol');
  const secret = (await p.textContent('code')).replace(/\s/g, ''); console.log('L1 QR svg:', await p.locator('svg').count() > 0, 'secret len', secret.length);
  await p.fill('#code', '000000'); await p.click('text=Activează'); await p.waitForSelector('text=Codul nu este valid'); console.log('L1 cod greșit refuzat');
  await p.fill('#code', code(secret)); await p.click('text=Activează'); await p.waitForSelector('#codes-title');
  const codes = await p.locator('ul.font-mono li').allTextContents(); console.log('L2 coduri de recuperare:', codes.length);
  await p.click('text=Am salvat codurile'); await p.waitForURL('**/registry'); console.log('L2', (await p.textContent('main')).includes('Ana (fictiv)'));
  await p.click('text=Deconectare'); await p.waitForURL('**/login');
  // L3: login din nou, fără QR
  await login(p, 'ana.registrator', 'Registru!2026'); await p.waitForURL('**/2fa'); console.log('L3 fără QR, pe /2fa');
  const used = code(secret, Date.now() + 30000);
  await p.fill('#code', used); await p.click('text=Verifică'); await p.waitForURL('**/registry'); console.log('L3 cod valid acceptat');
  await p.click('text=Deconectare'); await p.waitForURL('**/login');
  await login(p, 'ana.registrator', 'Registru!2026'); await p.waitForURL('**/2fa');
  await p.fill('#code', used); await p.click('text=Verifică'); await p.waitForSelector('text=Codul nu este valid'); console.log('L3 același cod (replay) refuzat');
  await p.goto(B + '/registry'); console.log('L3 fără 2FA, /registry →', new URL(p.url()).pathname);
  // L5: cod de recuperare, o singură dată
  for (const i of [1, 2]) {
    await login(p, 'ana.registrator', 'Registru!2026'); await p.waitForURL('**/2fa');
    await p.click('text=Folosește un cod de recuperare'); await p.fill('#code', codes[0]); await p.click('text=Verifică');
    if (i === 1) { await p.waitForURL('**/registry'); console.log('L5 cod de recuperare acceptat'); await p.click('text=Deconectare'); }
    else { await p.waitForSelector('text=Codul nu este valid'); console.log('L5 același cod refuzat a doua oară'); }
  }
  // L4: Mihai, 5 coduri greșite → blocat
  const p2 = await (await b.newContext()).newPage();
  await login(p2, 'mihai.responsabil', 'Deseuri!2026'); await p2.waitForURL('**/enrol');
  for (let i = 1; i <= 5; i++) { await p2.fill('#code', '000000'); await p2.click('text=Activează'); await p2.waitForSelector(i < 5 ? `text=Mai aveți ${5 - i}` : 'text=Contul este blocat'); }
  console.log('L4 blocat după 5:', await p2.textContent('[aria-live=assertive]'));
  await login(p2, 'mihai.responsabil', 'Deseuri!2026'); await p2.waitForSelector('text=Contul este blocat'); console.log('L4 parola refuzată cât timp e blocat');
  await login(p2, 'elena.director', 'gresit'); await p2.waitForSelector('text=nu sunt corecte'); console.log('parolă greșită refuzată');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
