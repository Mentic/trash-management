# Harta proiectului trash-management

Actualizată: 11.11.2026. Context portabil pentru Codex și conversații ChatGPT.
Aceasta este o fotografie a codului inspectat, nu o garanție că starea rămâne aceeași.

## Scop și limite

Prototip de prezentare pentru ADI Eco Buzău 2009: registratură de documente și
evidența deșeurilor. Etapa 1 urmărește un demo coerent de aproximativ 15 minute:
2FA → circuit document → import CSV cu erori → trasabilitate pe UAT/tichet → estimare AFM.
Etapele 2–3 nu trebuie presupuse implementate. Datele operaționale sunt fictive;
numele celor 7 UAT-uri sunt reale, codurile SIRUTA 900001–900007 sunt demo.

## Tehnologie și structură

Versiuni declarate în package.json: Next.js 16.4.6, React 19.3.1, TypeScript 5.9.3,
Drizzle ORM 0.45.4, Tailwind CSS 4.3.5, Vitest 5.1.0. Node >=22, pnpm 10.28.0.
PostgreSQL 17 în Docker Compose. Monolit full-stack cu App Router și Server Actions.

| Cale | Responsabilitate |
| --- | --- |
| `src/app/` | Login, înrolare 2FA, verificare 2FA, registru provizoriu, layout, health API |
| `src/server/actions/auth.ts` | Parolă, înrolare, verificare TOTP/recuperare, logout |
| `src/server/auth/` | Sesiuni DB, cookie opac, criptare, hash parole, pregătire înrolare |
| `src/server/audit.ts` | Scriere evenimente de audit |
| `src/domain/` | Stări documente, termene, coduri, TOTP, CSV, cantități, deplasare date demo |
| `src/domain/waste/` | Validări import V1–V6 și estimare AFM |
| `src/db/` | Schema Drizzle, client, migrări, alocare atomică număr registru |
| `src/seed/` | Bootstrap și încărcare parțială a datelor de referință |
| `src/instrumentation.ts` | Apelează bootstrap la pornirea runtime-ului Node |
| `src/config/env.ts` | Configurație de mediu |
| `seed/` | JSON/CSV demo, generator și validator Python, rezultate așteptate |
| `tests/unit/` | Teste de domeniu cu Vitest |
| `tests/e2e/auth-smoke.cjs` | Script smoke autentificare; necesită Playwright separat |
| `docs/` | BRD, cerințe tehnice, cercetare și decizii |
| `Dockerfile`, `compose*.yml`, `Caddyfile`, `docker/` | Rulare locală/VPS, proxy și inițializare DB |
| `.github/workflows/` | CI și deploy manual pe VPS |

## Implementat în cod

- Login cu parolă, TOTP cu QR, coduri de recuperare, anti-replay, blocare după coduri
  greșite și audit de securitate. Roluri: registrar, officer, director.
- Sesiuni în PostgreSQL; expirare și reîmprospătare pe activitate în codul server.
- Schema pentru utilizatori, sesiuni, configurare, registratură, deșeuri, importuri,
  aprobări anuale, anexe și audit. Existența tabelelor nu implică fluxuri UI complete.
- Numerotare atomică anuală; migrări cu protecții pentru audit și anexe.
- Funcții pure pentru tranziții și termene documente, CSV românesc, V1–V6 și AFM.
- Bootstrap aplică migrările dacă există DATABASE_ADMIN_URL; în modul demo, când
  nu există utilizatori, încarcă utilizatorii și datele de referință.

## Lipsuri constatate

- `src/app/registry/page.tsx` este explicit un ecran temporar după autentificare.
  Circuitul documentelor, căutarea și fișa documentului nu sunt implementate în UI.
- Modulul de deșeuri are reguli și schemă, dar nu are pagini/flux complet de import,
  corectare, drill-down, raportare și export conectate la DB.
- Loader-ul nu încarcă încă documentele și cursele demo. Setul de fișiere conține
  120 de documente și 5.321 de curse, dar acestea nu sunt populate de loadReference.
  Contorul este totuși inițializat din setul documentelor, la 120 pentru 2026.
- Resetarea completă a demo-ului din UI, avertizarea de expirare și ecranul jurnal
  rămân de construit conform planului.
- Smoke test-ul E2E este separat; Playwright nu apare în package.json, iar CI-ul
  inspectat nu rulează acest script. Nu este încă o suită E2E completă.

## Convenții și surse

- Cantități stocate în kg întregi; CSV folosește convențiile românești.
- Formula AFM din cod primește cantități, procent și tarif și rotunjește suma la leu.
  Reprezintă logica demo; această analiză nu verifică legalitatea parametrilor.
- UI în română, date locale, Europe/Bucharest; marcaj „DEMO — date fictive”.
- Găzduire UE și posibilitate de self-hosting, conform deciziilor existente.
- `docs/brd/BRD_v2.2.md`: reper de business; `docs/cerinte-tehnice.md`: proiectare;
  `docs/context/decisions_and_constraints.md`: scop și compromisuri acceptate.
- `docs/README.md` acordă prioritate versiunilor live; acestea nu au fost confruntate
  cu exporturile locale în această analiză. Statutul aprobării BRD trebuie clarificat:
  indexul îl numește aprobat, dar coloana de stare spune „În aprobare”.

## Verificare și pași recomandați

Analiza din 11.11.2026 a inclus citirea structurii, codului principal și documentației
locale și rularea `python3 -I seed/validate_seed.py seed`: ALL CHECKS PASSED.
Nu au fost rulate build-ul, testele TypeScript/Vitest, aplicația sau testele E2E;
dependențele node_modules nu erau instalate în workspace. Nu este un audit complet.

Ordine propusă: loader complet → circuit vertical de registratură cu autorizare și
audit → import deșeuri și corectare → agregare/AFM/export → reset și scenariu E2E demo.

## Reutilizare în conversații

În Codex, deschide acest repository; AGENTS.md trimite la această hartă.
În ChatGPT web, încarcă harta ca sursă într-un Project și începe conversațiile acolo.
Fișierele locale nu devin automat accesibile în browser. O copie încărcată trebuie
înlocuită când proiectul se schimbă. Pentru modificări de cod este necesar și accesul
la versiunea curentă a repository-ului sau la fișierele relevante.
