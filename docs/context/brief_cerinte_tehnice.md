# Agent brief — write the technical requirements

## Your task

Write the **technical requirements document** (cerințe tehnice) for the demo web app *"Registratură și evidența deșeurilor"* for ADI Eco Buzău 2009, based on the approved business requirements in `01_brd/BRD_v2.2.md`.

The reader is the developer who will build it alone (Ionut: full-stack, Java + React). The document must be detailed enough that he can start coding **Etapa 1** without coming back with business questions.

## Read in this order

1. `05_context/decisions_and_constraints.md` — goal of the demo, stack decisions already taken, the "wow" moments. **Read first.**
2. `01_brd/BRD_v2.2.md` — the source of truth for every business rule. Key sections: roles and access matrix, autentificare și 2FA (S01–S08), registratură (R01–R09, numerotare, stări, scenarii R1–R8), evidența deșeurilor (D01–D08, dicționar de date, reguli V1–V6, reguli de calcul, stări rânduri, scenarii D1–D7), model conceptual de date, setul de date demo, cerințe nefuncționale (N01–N09), accesibilitate (A01–A11), trasabilitate, **etape de livrare**, ipoteze I01–I17.
3. `04_seed_data/README.md` and the files next to it — the exact data the app must load; the validator is an executable spec of V1–V6.
4. `05_context/beneficiary_research.md` — who the client is (context only).
5. `02_review/` and `03_original/` — history; only needed if you want to see why a rule exists.

## Hard rules

- **Do not change business rules.** If something in the BRD looks wrong or impossible, keep it, and list it under "Conflicts / questions for the product owner" with your proposed resolution.
- **Every "Ipoteză demo" (I01–I17) becomes a configuration value or a clearly isolated rule**, never hard-coded deep in logic, because the client may change it.
- **Trace everything**: every technical component, endpoint, table and test references the BRD IDs it implements (S/R/D/A/N/V, scenario steps R1–R8, D1–D7, L1–L6).
- **Etapa 1 in full detail; Etapa 2 and 3 at design level** (data model and extension points ready, no detailed implementation).
- Respect the stack decisions in `decisions_and_constraints.md`. Where one is left open (ORM, hosting provider, auth library, file storage, PDF/print approach, background jobs), **decide and justify in 2–3 lines**, naming the alternative you rejected.
- Write in **Romanian** (same as the BRD); code identifiers, table and column names in English.

## Things that are easy to get wrong

- **Registry numbering** (R06, numerotare 1–7): one annual counter shared by incoming, outgoing and internal documents; allocated atomically in a DB transaction at confirmation; never reused (cancelled numbers stay). Seed ends at 120/2026, so the next confirmed document must be **121/2026**.
- **Document states** in the seed use snake_case codes: `inregistrat, repartizat, in_redactare, in_aprobare, aprobat, iesire_inregistrata, expediat, clasat, anulat` (plus `ciorna`, which never appears in the seed because drafts have no number). Waste rows in the seed are `aprobat` (2025) and `validat` (Jan–Sep 2026). Map these to the BRD state names explicitly.
- **Access control must be enforced server-side**, including direct links and exports (R07): Mihai must get "not found/forbidden" for a document not assigned to him.
- **Seed date shifting**: all seed dates are relative to the anchor 10.11.2026 (`parametri.json → ancora_date`). On load/reset, shift every date so the anchor becomes the day before the reset; monthly periods shift by whole months. Deadlines and the two intentionally overdue items must stay correct after shifting.
- **CSV format** (I10): UTF-8 with BOM, separator `;`, decimal comma, exact header names; exports must open correctly in Romanian Excel (N04).
- **Rule order in the import** that the validator assumes: V1 (format, reject) → V6 (closed year, reject) → V2 (duplicate key operator_cui + nr_tichet + data_cantaririi, against the file and the DB) → V3 (|reported − ticket| > 0,020 t) and V4/V5 (origin). Rejected rows (V1, V6) are not stored as rows; flagged rows are stored but excluded from validated totals.
- **AFM estimate** (D03): Q_ob = p(annex 6, per year) × Q_mun; eligible Q_val = destinations sortare + reciclare + compostare + altă valorificare (I12); C = max(0, Q_ob − Q_val) × 50 lei/t. The seed README lists the expected 2025 results per UAT — use them as test oracles.
- **2FA**: TOTP RFC 6238, SHA-1, 6 digits, 30 s, accept ±1 step, reject replay of a used code, lock 5 minutes after 5 wrong codes, 10 one-time recovery codes stored hashed, secret encrypted at rest. Seed users start **not enrolled** so enrolment can be shown live. The code field must accept paste and `autocomplete="one-time-code"` (A08).
- **Separation of duties**: Mihai validates rows; only Elena approves the annual total per UAT (D07). Annual approval is refused while the UAT has flagged/corrected rows for that year.
- **"DEMO — date fictive"** marker on every screen that shows seed data.

## Expected structure of your deliverable

1. Scop și context (Etapa 1 focus, link to BRD version 2.2)
2. Arhitectură — diagram + stack choices with rationale
3. Medii și găzduire (EU), configurare, secrete
4. Model de date fizic — tables, enums, constraints, indexes, the registry counter, audit log (append-only)
5. Logica de domeniu — state machines (allowed transitions + who), numbering, deadline calculation, V1–V6 pipeline, calculations, annual approval/reopen
6. Autentificare și autorizare — password hashing, TOTP flow, recovery codes, lockout, sessions, RBAC from the BRD access matrix
7. Interfața serverului — Server Actions / Route Handlers per screen, with inputs, outputs, errors, required role
8. Ecrane — per screen: components, data loaded, actions, empty/error states, accessibility notes
9. Import și export — parsing, limits (N02/N03), CSV export, A4 print
10. Set de date demo și resetare — loader, date-shift algorithm, reset flow
11. Testare — unit tests per rule; Playwright end-to-end for scenarios R1–R8, D1–D7, L1–L6; the seed validator as a CI check; axe accessibility checks
12. Cerințe nefuncționale — how each N01–N09 and A01–A11 is met
13. Securitate și GDPR
14. Plan de livrare Etapa 1 — week-by-week for 3–4 weeks, with the riskiest items first; plus the meeting kit (reset button, offline fallback)
15. Matrice de trasabilitate — BRD ID → component → test
16. Conflicte și întrebări pentru product owner

## Definition of done for your document

- Every BRD requirement in Etapa 1 maps to at least one component and one test.
- A developer can create the database schema and the project skeleton from sections 2–4 without guessing.
- All open technical choices are decided and justified.
- Scenarios R1–R8, D1–D7 (except D6), L1–L4 can be run end to end on the seed data as written.
