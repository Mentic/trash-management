# Registratură și evidența deșeurilor — ADI Eco Buzău 2009 (demo)

Prototip pentru prima întâlnire cu ADI Eco Buzău 2009 (Etapa 1 din BRD v2.2). Cerințele tehnice sunt în
documentul „Registratură și evidența deșeurilor — cerințe tehnice și soluția propusă” (secțiunile citate mai jos).

## Stare

| Gata | Urmează (plan, sec. 14) |
| --- | --- |
| Schema PostgreSQL (21 tabele, jurnal append-only, contor de registru) | Autentificare parolă + 2FA în aplicație (S01–S08) |
| Reguli de domeniu: V1–V6, AFM, termene, stări document, TOTP, CSV, mutarea datelor | Loader set demo + resetare (sec. 10) |
| Teste unitare pe setul demo (oracolul AFM, rezultatele importurilor) | Registratură R1–R8, deșeuri D1–D7, Playwright |
| Docker Compose (app, Postgres 17, Caddy), CI, deploy manual | Ecranele din sec. 8 |

## Rulare pe laptop (Docker Desktop)

```bash
git clone https://github.com/ionutvacariu/trash-management && cd trash-management
git checkout claude/etapa1-schelet
sh scripts/init-env.sh
docker compose -f compose.yml -f compose.local.yml up -d --build
docker compose exec app node migrator/migrate.mjs
```

Aplicația: http://localhost:3000 · verificare: http://localhost:3000/api/health

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

## Structură

- `src/domain/` — reguli pure, fără Next.js (sec. 5)
- `src/db/` — schema Drizzle, migrări, alocarea numărului de registru (sec. 4, 5.2)
- `seed/` — setul de date demo, generatorul și validatorul (copie din kitul de cerințe)
- `compose.yml`, `Caddyfile`, `Dockerfile` — rulare pe orice VPS Linux (sec. 3, 17)
