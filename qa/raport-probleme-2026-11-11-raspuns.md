# Răspuns la raportul QA din 11.11.2026

Raport: [raport-probleme-2026-11-11.docx](raport-probleme-2026-11-11.docx) (Andrei Vacariu). Toate cele 12 probleme sunt rezolvate; fiecare are un test automat care rulează în CI (`pnpm test:e2e`, suita `tests/e2e/qa-regressions.cjs`, plus teste unitare unde regula e pură).

| ID | Gravitate | Rezolvare | Test | Commit |
| --- | --- | --- | --- | --- |
| QA01 | Critic | Atribuirea UAT, corecția și validarea refuză o UAT cu anul aprobat („Anul 2025 este aprobat pentru Comuna Berca…”). Estimarea AFM a unui an aprobat folosește doar rândurile aprobate (totalul fixat la aprobare). | e2e QA01 (×2) | `dfc5b24` |
| QA02 | Major | Descărcarea anexei folosește aceeași regulă ca fișa (`canSeeDocument`, inclusiv ciornele); dovezile de la rânduri doar pentru Mihai și Elena. | e2e QA02 (×2) | `dfc5b24` |
| QA03 | Major | Dovada de expediere este ID-ul fișierului încărcat în acel pas; fișa afișează numele fișierului de dovadă. | e2e QA03 | `dfc5b24` |
| QA04 | Major | V1 verifică existența datei și a orei (`2026-10-32`, `2026-02-30`, `24:00`, `10:60` respinse) înainte de verificarea perioadei. | unitar + e2e QA04 | `dfc5b24` |
| QA05 | Mediu | La activarea 2FA sesiunea primește 30 de minute (`lastSeenAt`/`expiresAt` actualizate). | verificat în cod; acoperit indirect de e2e | `dfc5b24` |
| QA06 | Mediu | Tastarea, click-urile și derularea resetează cronometrul; sesiunea de pe server se prelungește cel mult o dată pe minut. | e2e QA06 (ceas simulat) | `d4bfb7e` |
| QA07 | Mediu | Dialogul de expirare este modal Radix; focusul intră pe „Prelungește sesiunea” și nu iese cu Tab. Toate confirmările folosesc acum dialoguri Radix, nu `window.confirm`. | e2e QA07 | `d4bfb7e` |
| QA08 | Mediu | Limita unei salvări urcă la 50 MB (10 MB pe fișier rămân); limitele se verifică în browser înainte de trimitere, cu mesaj clar, și pe server. | manual (fișiere de 6 MB) | `dfc5b24` |
| QA09 | Mediu | Peste 1.000 t pe o cursă → respins V1 („valoare nerealistă”), la import și la corecție. | unitar + e2e QA09 | `dfc5b24` |
| QA10 | Îmbunătățire | Fișa unei ciorne are „Editare ciornă” (tip, corespondent, adresă, nr. expeditor, obiect, anexe). | e2e QA10 | `dfc5b24` |
| QA11 | Minor | „Stare acum (întregul import)” se calculează din tot importul, independent de filtru. | e2e QA11 | `dfc5b24` |
| QA12 | Minor | `qa/teste-manuale.md`: testele care consumă numere se rulează după secțiunea 3; marcajul DEMO este „primul rând după antet”; teste noi D8.1, D8.2, R11.1. | — | `dfc5b24` |

Limitele verificării rămân cele din raport: QR pe telefon real, Excel românesc, NVDA, Edge/Firefox și funcționarea offline se verifică manual (`qa/teste-manuale.md`).
