# Harta proiectului trash-management

Actualizată: 11.11.2026, seara (după raportul QA și redesign). Context portabil pentru Claude Code, Codex și ChatGPT.
Este o fotografie a codului; verifică fișierele curente înainte de a te baza pe ea și actualizeaz-o când schimbi arhitectura.

## Scop și limite

Prototip de prezentare pentru ADI Eco Buzău 2009: registratură și evidența deșeurilor. Etapa 1 este **completă**:
2FA → circuitul documentului → import CSV cu erori → trasabilitate pe UAT/tichet → estimare AFM, cu set demo și resetare.
Extensie peste BRD: **multi-tenant** — portal per primărie (vezi `docs/multi-tenant.md`).
Etapele 2–3 nu sunt implementate (aprobarea/redeschiderea anuală din UI, închiderea anului, dovezi la rânduri, reset 2FA,
PAYT, indicatorul de reciclare, găzduire de producție). Datele sunt fictive; UAT-urile reale, SIRUTA demo 900001–900007.

## Tehnologie

Next.js 16.4.6 (App Router, Server Actions), React 19.3.1, TypeScript 5.9.3, PostgreSQL 17, Drizzle ORM 0.45.4,
Tailwind CSS 4.3.5, componente shadcn/ui pe `radix-ui`, `lucide-react`, Inter local. Vitest 5.1.0, Playwright 1.63.0.
Node ≥ 22 (Docker: Node 24), pnpm 10.28.0. Docker Compose (app, Postgres, Caddy); `compose.local.yml` pentru laptop.

## Structură

| Cale | Responsabilitate |
| --- | --- |
| `src/app/` | Ecrane: login, înrolare/2FA, registru, document nou, fișă, imprimare, nomenclator, import deșeuri, situație pe UAT cu drill-down, tichet, date UAT și AFM, jurnal, kit demo; API pentru export CSV, anexe, health, fișiere demo |
| `src/server/actions/` | Server Actions: `auth`, `registry`, `waste`, `demo`, `session` (guard de rol + scope, mașina de stări, jurnal în tranzacție) |
| `src/server/queries/` | Citiri: registru (+ panoul „De lucru”), fișă, deșeuri |
| `src/server/auth/` | Sesiuni în DB, cookie opac, criptare TOTP, Argon2id, RBAC (`rbac.ts`, `canSeeDocument`) |
| `src/server/waste/importer.ts` | Import CSV, re-verificare, protecția anilor aprobați |
| `src/domain/` | Reguli pure: stări, termene, coduri, TOTP, CSV, cantități, V1–V6, AFM, mutarea datelor demo |
| `src/db/` | Schema Drizzle, migrări (inclusiv jurnal append-only), contor atomic |
| `src/seed/` | Bootstrap (migrări + set demo la pornire), loader complet, resetare |
| `src/components/` | UI: `ui/` (shadcn), `ActionForm`, `useConfirm`, `flow` (pași, „Pasul următor”, mesaje), `FileInput`, `SessionTimer`, `NavLinks` |
| `src/server/queries/tenant.ts`, `src/app/portal`, `src/app/p/[slug]`, `src/app/tenants` | Multi-tenant: rezolvarea tenantului (izolare), portalul, autentificarea primăriei, personalizarea |
| `src/lib/` | Formate românești, etichete, mesaje de confirmare, sensuri, istoric |
| `seed/` | Setul demo, generator, validator, rezultate așteptate |
| `tests/unit/`, `tests/e2e/` | Vitest; Playwright: `auth-smoke`, `demo-scenarios` (29), `qa-regressions` (11), `tenants` (20) |
| `scripts/e2e.mjs` | Rulează suitele e2e pe build-ul de producție, fiecare pe o bază nouă |
| `qa/` | Teste manuale, scriptul demo, checklist, raportul QA și răspunsul |
| `.claude/skills/ux/` | Skill-ul de UX: sistemul vizual și regulile de interfață |
| `docs/` | BRD, cerințe tehnice (export), context și această hartă |

## Convenții

- Cantități în kg întregi; conversia în tone la intrare/afișare/export. CSV: BOM, `;`, virgulă zecimală.
- Fiecare mutație: `requireUser` + scope pe rând, mașina de stări, blocare optimistă (`version`), jurnal în aceeași tranzacție,
  apoi `redirect(...?ok=<cheie>)` cu mesajul din `src/lib/messages.ts`.
- UI în română cu diacritice corecte, Europe/Bucharest, marcaj „DEMO — date fictive”. Regulile vizuale: `.claude/skills/ux/SKILL.md`.

## Verificare

`pnpm typecheck`, `pnpm test`, `pnpm seed:validate`, `pnpm build`, `pnpm test:e2e` (vezi README). CI rulează toate, inclusiv
e2e în imaginea oficială Playwright. Rămân manuale: QR pe telefon, Excel românesc, imprimare A4, NVDA, Edge/Firefox, offline.
