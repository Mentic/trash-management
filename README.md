# Registratură și evidența deșeurilor — ADI Eco Buzău 2009 (demo)

Prototip pentru prima întâlnire cu ADI Eco Buzău 2009 (Etapa 1 din BRD v2.2). Toată documentația este în [`docs/`](docs/README.md), testele manuale și scriptul demo în [`qa/`](qa/README.md); cerințele tehnice sunt în
documentul „Registratură și evidența deșeurilor — cerințe tehnice și soluția propusă” (secțiunile citate mai jos).

## Stare — Etapa 1 gata pentru demo

| Modul | Ce funcționează | Scenarii verificate automat |
| --- | --- | --- |
| Autentificare | Parolă, 2FA cu cod QR, coduri de recuperare, anti-replay, blocare 5 min, expirare sesiune 30 min cu avertizare, jurnal de securitate | L1–L5, S08 |
| Registratură | Registru filtrat pe rol, căutare (inclusiv după numărul extern al intrării), filtre, export CSV, înregistrare cu termen calculat, fișă cu istoric complet, repartizare, redactare, returnare cu motiv, aprobare, ieșire legată, expediere cu dovadă, clasare, corecție cu valoare veche/nouă, anulare, prelungire termen, anexe imuabile, imprimare A4, nomenclator | R1–R8 |
| Deșeuri | Import CSV legat de intrare, V1–V6 cu raport, excludere, corecție cu re-verificare, atribuire UAT cu dovadă, validare; situație pe UAT cu drill-down până la tichet; categorii separate; export CSV; estimare AFM cu formula | D1–D5, D7 |
| Demo | Set demo încărcat automat (120 documente, 5.321 curse), Kit demo cu fișierele de import și resetare (opțional cu păstrarea înrolărilor 2FA), marcaj „DEMO — date fictive” | N08 |

Etapa 2 (după semnare): aprobarea/redeschiderea anuală (D07, D6), închiderea anului (R03), dovezi la rânduri (D04), reset 2FA de către director (S06), PAYT și indicatorul de reciclare (D01, D02).

## Rulare pe laptop (Docker Desktop)

```bash
git clone https://github.com/ionutvacariu/trash-management && cd trash-management
git checkout claude/etapa1-schelet
sh scripts/init-env.sh
docker compose -f compose.yml -f compose.local.yml up -d --build
```

Aplicația: http://localhost:3000 · verificare: http://localhost:3000/api/health

La pornire, aplicația aplică migrările și, dacă baza e goală, încarcă conturile demo (Ana, Mihai, Elena — neînrolate în 2FA)
și datele de referință. Prima autentificare a fiecărui cont afișează codul QR.

Între repetiții: **Kit demo → Resetează datele demo** (bifat „Păstrează înrolările 2FA” ca să nu rescanați codurile QR).
De la zero, inclusiv înrolările: `docker compose -f compose.yml -f compose.local.yml down -v`, apoi `up -d`.

Oprire: `docker compose -f compose.yml -f compose.local.yml down` (datele rămân în volume; `down -v` le șterge).

## Acces din afară cu ngrok (opțional)

Pentru întâlnire nu e nevoie: prezentarea rulează de pe laptop, iar telefonul doar scanează codul QR de pe ecran
(aplicația TOTP nu are nevoie de rețea). ngrok ajută doar dacă clientul vrea să deschidă demo-ul de pe dispozitivele lui.

```bash
ngrok config add-authtoken <TOKEN>
ngrok http 3000 --url <domeniul-static>.ngrok-free.app
```

- Pe planul gratuit, vizitatorii văd întâi o pagină de avertizare ngrok; planul plătit o elimină.
- Traficul trece prin serverele ngrok (firmă din SUA); în demo sunt doar date fictive, dar pentru date reale nu.

Fără Docker: `pnpm install`, un PostgreSQL local, `DATABASE_ADMIN_URL=... pnpm db:migrate`, apoi `pnpm dev`.

## Verificări

```bash
pnpm typecheck && pnpm test
pnpm seed:validate
```

Scenariile de acceptare (L1–L5, R1–R8, D1–D5, D7, S08, N08) pe build-ul de producție, fiecare pe o bază proaspătă.
Rulează automat în CI (jobul `e2e`); local, cu un PostgreSQL în care există rolul `app_rw`:

```bash
pnpm exec playwright install chromium
pnpm build
PG_ADMIN_BASE=postgres://app_admin:PAROLA@localhost:5432 APP_RW_PASSWORD=PAROLA_RW pnpm test:e2e
```

## Structură

- `src/domain/` — reguli pure, fără Next.js (sec. 5)
- `src/db/` — schema Drizzle, migrări, alocarea numărului de registru (sec. 4, 5.2)
- `seed/` — setul de date demo, generatorul și validatorul (copie din kitul de cerințe)
- `compose.yml`, `Caddyfile`, `Dockerfile` — rulare pe orice VPS Linux (sec. 3, 17)
