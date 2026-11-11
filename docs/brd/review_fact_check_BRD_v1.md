# BRD Registratură ADI — Fact-check & Review (of BRD v1)

11.11.2026 · Ionut

> Context: this review was done on the original BRD v1 (see `03_original/`). All findings below were addressed in BRD v2.x (`01_brd/BRD_v2.2.md`). Kept for traceability of the legal checks.

## Verdict

All eight legal sources in the BRD exist, and the paraphrases match the consolidated texts. None of the citations is wrong or made up.

The weak points are elsewhere: some legal conditions are left out, and a few of them change the data model. The document also lacks the usual BRD scaffolding: scope, glossary, data dictionary, document states, access rules and version control.

## Fact-check, source by source

| Source | Result | What to change |
| --- | --- | --- |
| [1] [Legea 16/1996](https://legislatie.just.ro/public/DetaliiDocument/7937), art. 7, 8, 27¹ | Correct | Art. 27¹ was introduced by [Legea 201/2024](https://legislatie.just.ro/Public/DetaliiDocument/284563), in force since 29 June 2024. R02 matches it almost word for word. Add "(introdus prin Legea 201/2024)" to the citation. |
| [2] [OG 27/2002](https://legislatie.just.ro/Public/DetaliiDocument/33817) art. 8–9; Legea 544/2001 art. 7 | Deadlines correct | 30 days from registration, extendable by at most 15 days. Legea 544/2001 art. 7 (10/30 days) was not re-read in this pass. Both acts apply to public authorities and institutions; an ADI is a private-law, public-utility body, so applicability is debatable. "Condiționată" is right, but state the condition: the beneficiary decides whether they apply. |
| [3] GDPR art. 5, 25, 32 | Correct | Principles, data protection by design, security of processing. |
| [4] [OUG 92/2021](https://legislatie.just.ro/Public/DetaliiDocument/259052) art. 17(5) | Correct | Names ADIs explicitly; covers PAYT and recycling targets of 55% (2025), 60% (2030), 65% (2035). Legea 17/2023 changed the letters within the paragraph: cite letters with the consolidation date used. |
| [5] [Legea 101/2006](https://legislatie.just.ro/Public/DetaliiDocumentAfis/275237) art. 42(4) | Correct | Replace "în forma republicată după modificările OUG 133/2022" with "republicată în M.Of. nr. 920/12.10.2023". D02 omits a condition (see below). |
| [6] [OUG 196/2005](https://www.ecotic.ro/wp-content/uploads/2026/06/OUG-196.pdf) art. 9(1)(p), art. 11(2), annex 6 | Correct | 50 lei/t on the gap between the target quantity and the quantity sent to recycling or other recovery. Missing: the 25 January deadline, the special case for UATs without an organised service, and the annex 6 percentage (see below). |
| [7] [HG 1061/2008](https://www.rubinian.com/hg-1061-2008-transportul-deseurilor-periculoase-si-nepericuloase) art. 22–23, annex 3 | Correct | Art. 23(1) exempts municipal waste transport by sanitation operators. Add art. 23(2): the same operators transporting their own non-hazardous waste still fill in the loading-unloading form. |
| [8] Ordinul 701/2024 | Correct | MMAP order approving the SIATD usage instructions ([source](https://avp.ro/wp-content/uploads/2024/04/informare-din-11-aprilie-2024.pdf)). Watch item: a [June 2026 draft government decision](https://www.ces.ro/newlib/PDF/proiecte/2026/16_06_2026-NF-MJ-FARA-track-modificata-17.06.pdf) on a SIATD-PF component run by AFM; not adopted as far as found. |

### Conditions the BRD leaves out

**D02, Legea 101/2006 art. 42(4).** The ADI must calculate the adjustment factors "astfel încât să nu se modifice cantitatea totală de deșeuri contractată", based on the average generation index for urban and rural areas set in the contract. Each UAT therefore needs an urban/rural classification, and the contracted total quantity must be stored.

**D03, OUG 196/2005.**

- **Deadline:** the contribution is declared and paid annually by 25 January of the following year (art. 11(2)).
- **Special case:** UATs without an organised sanitation service pay on the whole estimated quantity, at 233 kg/inhabitant/year urban and 105 kg/inhabitant/year rural.
- **Annex 6 percentage:** the current value was not confirmed (historically 45% from 2019). State the percentage, its source, and the formula that produces the target quantity.
- **Payer:** the UAT, not the ADI.

## Gaps that were closed in BRD v2

1. Nomenclatorul arhivistic (art. 8) — file reference, retention period, year closing.
2. D02/D03 legal conditions.
3. Data dictionary for the CSV import (types, units, SIRUTA, LER, duplicate key, tolerance, unconfirmed origin).
4. Document and waste-row state machines.
5. Separation of duties (corrector ≠ annual approver).
6. Explicit access matrix.
7. Numbering rules (cancellations, year reset, reply numbering, petition redirect in 5 days).
8. BRD scaffolding (version control, context, scope, glossary, NFRs, traceability).
9. Testable acceptance criteria for every requirement.
10. Link between modules (every import references an incoming registry number).
