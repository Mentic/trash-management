# Decisions and constraints (from the working session of 11.11.2026)

These were agreed with the product owner (Ionut, solo full-stack developer, Java + React background) while the BRD was written. They are **not all in the BRD**, because some are technical. The technical requirements must respect them unless a strong reason is documented.

## Business goal of the demo

- The demo is a **sales tool**: first contact with ADI Eco Buzău 2009, goal = get them to sign a contract.
- What convinces at a first meeting: **15 minutes that work flawlessly**, not breadth. Polish beats feature count. A demo that breaks in front of the client costs more than a narrower one.
- Present it explicitly as a **prototype** (avoid anchoring the price low by looking "almost done").
- Scope for the meeting = **Etapa 1** in the BRD (section "Etape de livrare"). Etapa 2/3 only need to be designed, not built.
- Target effort for Etapa 1: **3–4 weeks, one developer**.
- Meeting logistics to support: rehearsed 15-minute script, seeded data, a reset button, an offline fallback (local run or recorded video).

## "Wow" moments the demo must deliver (in this order)

1. Login with **2FA: QR code scanned live** with a phone authenticator app.
2. Full lifecycle of one document: register → assign → return with reason → approve → outgoing number → dispatch → search by external number.
3. Import of a "dirty" operator CSV with errors flagged on the spot (duplicate, quantity difference, shared route unattributed).
4. Click on a UAT total and **drill down to the weigh ticket** behind it.
5. AFM contribution estimate with the formula visible, and a CSV export that opens correctly in Romanian Excel.

## Technical decisions already taken

| Topic | Decision | Notes |
| --- | --- | --- |
| Stack | **Next.js full-stack** (App Router), TypeScript. Not Java + separate UI. | Pin the Next.js version; avoid experimental features. |
| Backend | Real server: Route Handlers / Server Actions + **PostgreSQL** | Demo is no longer browser-only (BRD v2.2). ORM choice (Prisma vs Drizzle) is open — decide and justify. |
| Hosting | **EU only** (data residency). E.g. Vercel region `fra1` + Neon/Supabase EU, or a Romanian VPS with Docker. | Next.js must stay self-hostable (Docker) in case the client wants on-prem later. |
| 2FA | Real TOTP verified server-side (RFC 6238, SHA-1, 6 digits, 30 s, ±1 step, replay protection) | See BRD S01–S08. |
| UI components | Accessible component library, e.g. **shadcn/ui (Radix)** | Gives baseline WCAG 2.1 AA behaviour for free. |
| Language | UI in Romanian with correct diacritics (ș, ț with comma), dates `ZZ.LL.AAAA`, Europe/Bucharest | |

## Known downsides of Next.js (accepted, must be handled)

- **Scheduled jobs** (deadline alerts, 25 January AFM reminder) are outside Next.js → external cron or queue. Not needed for the Etapa 1 demo.
- **Version churn** → pin versions, stay on stable App Router APIs.
- **Audit / transactional discipline** is less "batteries included" than Spring → numbering and audit log must be explicitly transactional.
- If the client signs, the stack for production can be revisited; the tech requirements should note where this would matter.

## Data / content rules

- Use the **real names** of the 7 member UATs (makes the demo feel like "their" app); everything else is fictive and every screen with seed data shows **"DEMO — date fictive"**.
- **SIRUTA codes are demo codes (900001–900007)** — real ones were not verified; production loads them from the INS SIRUTA nomenclature (I17).
- The seeded AFM estimate shows **all 7 UATs owing a contribution** (3.745 – 93.793 lei). Realistic for Romanian recycling rates, but potentially sensitive in front of mayors. The product owner will decide how to present it; the tech design should make the demo values easy to adjust (they come from `gen_seed.py` parameters: eligible share and quantity factor per UAT).
- Real operator names: only the sorting station "Vadu Pașii (RER Sud)" appears, as a destination. The collection operator, landfill and compost platform are fictive.

## Pitch angle (business context the UI may reflect)

- The draft statute amendment of ADI Eco Buzău 2009 (Dec 2025) adds **art. 5 alin. (1) lit. g¹**: the association must develop and implement a **procedure for controlling and verifying** operators and users. The waste module is positioned as the tool for that obligation (operator report vs weigh tickets, flags, drill-down to evidence).
