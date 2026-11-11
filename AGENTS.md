# Context pentru conversațiile viitoare

Înainte de lucru, citește `docs/context/project-map.md` (harta proiectului și stadiul curent; verifică fișierele
înainte de a te baza pe ea și actualizeaz-o când modifici arhitectura sau finalizezi un modul).
Pentru orice schimbare de interfață, urmează `.claude/skills/ux/SKILL.md`.

## Repere

- Prototip de registratură și evidența deșeurilor pentru ADI Eco Buzău 2009; Etapa 1 completă.
- Cerințe: `docs/brd/BRD_v2.2.md`, `docs/cerinte-tehnice.md`, `docs/context/decisions_and_constraints.md`.
  Nu confunda cerințele planificate (Etapa 2–3) cu implementarea.
- Next.js App Router, TypeScript, React, PostgreSQL, Drizzle, Tailwind 4 + shadcn/ui (Radix); pnpm.
- Reguli pure în `src/domain/`, persistență în `src/db/`, autentificare și acțiuni în `src/server/`, pagini în `src/app/`.
- UI în română cu diacritice; Europe/Bucharest. Cantități în kg întregi. Datele demo marcate ca fictive.
- Numerotarea documentelor tranzacțională, jurnal append-only, autorizare pe server (inclusiv anexe și export).
- Verificări: `pnpm typecheck`, `pnpm test`, `pnpm seed:validate`, `pnpm build`, `pnpm test:e2e`.
  Rulează-le și precizează ce nu ai putut verifica. Problemele găsite în QA primesc un test în `tests/e2e/qa-regressions.cjs`.
- Nu include secretele din `.env` în documentație sau răspunsuri.
