# Context pentru conversațiile viitoare

Înainte de lucru, citește `docs/context/project-map.md`. Este harta proiectului și
stadiul constatat la ultima analiză; verifică fișierele curente înainte de a te baza
pe starea descrisă. Actualizează harta când modifici arhitectura sau finalizezi un modul.

## Repere

- Prototip de registratură și evidența deșeurilor pentru ADI Eco Buzău 2009, Etapa 1.
- Cerințe: `docs/brd/BRD_v2.2.md`, `docs/cerinte-tehnice.md` și
  `docs/context/decisions_and_constraints.md`. Consultă `docs/README.md` pentru
  statutul documentelor; nu confunda cerințele planificate cu implementarea.
- Next.js App Router, TypeScript, React, PostgreSQL, Drizzle; manager de pachete pnpm.
- Reguli pure în `src/domain/`, persistență în `src/db/`, autentificare și acțiuni
  server în `src/server/`, pagini în `src/app/`.
- UI în română cu diacritice; fus orar Europe/Bucharest. Cantități în kg întregi,
  conversie în tone la intrare/afișare/export. Datele demo trebuie marcate ca fictive.
- Păstrează numerotarea documentelor tranzacțională, auditul append-only și
  verificările de autentificare/autorizare pe server.
- Verificări disponibile: `pnpm typecheck`, `pnpm test`, `pnpm seed:validate`,
  `pnpm build`. Rulează verificările relevante și precizează ce nu ai putut verifica.
- Nu include secretele din `.env` în documentație sau răspunsuri.
