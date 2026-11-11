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

## Rulare locală

```bash
cp .env.example .env   # completați parolele și cheile (openssl rand -base64 32)
docker compose up -d --build
docker compose exec app node migrator/migrate.mjs
docker compose exec app node -e "fetch('http://localhost:3000/api/health').then(r=>r.json()).then(console.log)"
```

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
