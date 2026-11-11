# Set de date demo — Registratură și evidența deșeurilor, ADI Eco Buzău 2009

Setul de date pentru demo, conform BRD v2.2 (secțiunea „Setul de date demo”). Generat determinist de `gen_seed.py` și verificat de `validate_seed.py` (toate verificările trec).

## Ce este real și ce este fictiv

| Real (surse publice) | Fictiv |
| --- | --- |
| Numele celor 7 UAT-uri, toate membre ale ADI Eco Buzău 2009 | Codurile SIRUTA (900001–900007, coduri demo) |
| Mediul urban/rural | Toate cantitățile, tichetele, avizele, vehiculele (DEMO-01…07) |
| Populația la recensământul din 2021 | Operatorul de colectare (CUI 99999901) |
| Stația de sortare Vadu Pașii (RER Sud) ca destinație | Persoanele, adresele exacte, conținutul documentelor |
| Instituțiile care apar ca corespondenți (APM Buzău, AFM, CJ Buzău) | Depozitul și platforma de compostare |

Codurile SIRUTA reale nu au putut fi verificate dintr-o sursă sigură, deci nu au fost inventate. Ele se încarcă din nomenclatorul SIRUTA al INS (cerință tehnică, vezi BRD).

## UAT-uri

| SIRUTA demo | UAT | Mediu | Populație 2021 | Cantitate contractată (t/an) |
| --- | --- | --- | --- | --- |
| 900001 | Municipiul Râmnicu Sărat | urban | 29.774 | 6.937,3 |
| 900002 | Orașul Nehoiu | urban | 9.464 | 2.205,1 |
| 900003 | Orașul Pogoanele | urban | 6.384 | 1.487,5 |
| 900004 | Comuna Berca | rural | 7.741 | 812,8 |
| 900005 | Comuna Vadu Pașii | rural | 9.726 | 1.021,2 |
| 900006 | Comuna Cislău | rural | 4.218 | 442,9 |
| 900007 | Comuna Breaza | rural | 2.474 | 259,8 |

Cantitatea contractată = populația × indicele de generare (0,233 t/loc/an urban, 0,105 rural). Este o ipoteză demo (I16).

## Fișiere

| Fișier | Conținut |
| --- | --- |
| `uat.json` | Cele 7 UAT-uri de mai sus |
| `utilizatori.json` | Ana (registrator), Mihai (responsabil), Elena (director), cu parole demo; 2FA neînrolat, ca înrolarea să se arate live |
| `nomenclator.json` | 5 dosare cu indicativ și termen de păstrare |
| `parametri.json` | Procentul din anexa 6, țintele de reciclare, indicii de generare, toleranța, termenele, anul 2025 închis |
| `documente_2026.json` | 120 de documente (1/2026 … 120/2026), cu istoric, anexe și legături intrare–răspuns |
| `seed_deseuri_2025_2026-09.csv` | 5.321 de curse: 2025 aprobat, ianuarie–septembrie 2026 validat |
| `import_2026-10_restul_uat_curat.csv` | 220 de curse din octombrie pentru 5 UAT-uri, fără erori |
| `import_2026-10_scenariu_erori.csv` | 26 de rânduri pentru Berca și Cislău, cu erorile din scenariul de acceptare |
| `import_2026-10_test_V5_V6.csv` | 4 rânduri pentru regulile V5 și V6 |
| `rezultate_asteptate_import.json` | Ce trebuie să raporteze aplicația la fiecare import |
| `gen_seed.py`, `validate_seed.py` | Generatorul și validatorul |

## Registratura

- 120 de documente: 65 intrări, 41 ieșiri, 14 interne. Următorul număr liber este **121/2026**, ca în scenariul de acceptare.
- 19 lucrări deschise (7 înregistrate, 4 repartizate, 5 în redactare, 3 în aprobare), 99 clasate, 2 anulate.
- 2 lucrări depășesc termenul intenționat (90/2026 și 98/2026), ca evidențierea să se vadă.
- Rapoartele lunare ale operatorului (ianuarie–septembrie) sunt înregistrate ca intrări clasate fără răspuns, în dosarul II-1.

## Rezultate așteptate la import

**`import_2026-10_scenariu_erori.csv`** (26 de rânduri)

| Regulă | Tichet |
| --- | --- |
| V1 format greșit (cod LER `200301`) | T-2026-002539 |
| V2 duplicat | T-2026-002535 (a doua apariție) |
| V3 diferență 0,050 t | T-2026-002543 |
| V4 rută comună Berca–Cislău fără dovadă | T-2026-002534 |
| Importate fără semnalări | 22 |

**`import_2026-10_test_V5_V6.csv`**: V5 (SIRUTA 900099) la T-2026-002552; V6 (an închis 2025) la T-2025-999001; 2 rânduri curate.

## Estimarea AFM pentru 2025 (verificare a calculului)

Cu p = 45%, iar cantitatea eligibilă = destinațiile sortare și compostare:

| UAT | Q_mun (t) | Q_val (t) | Q_ob (t) | Contribuție estimată (lei) |
| --- | --- | --- | --- | --- |
| Râmnicu Sărat | 7.214,8 | 1.370,8 | 3.246,7 | 93.793 |
| Nehoiu | 2.094,9 | 272,3 | 942,7 | 33.518 |
| Pogoanele | 1.517,2 | 227,6 | 682,7 | 22.758 |
| Berca | 877,8 | 96,6 | 395,0 | 14.923 |
| Vadu Pașii | 990,6 | 168,4 | 445,8 | 13.868 |
| Cislău | 469,5 | 46,9 | 211,3 | 8.216 |
| Breaza | 241,6 | 33,8 | 108,7 | 3.745 |

Valorile sunt fictive și servesc doar la testarea formulei. În demo trebuie să apară marcate „DEMO — date fictive”.

## Datele relative

Toate datele sunt generate față de ziua-ancoră **10.11.2026** (`parametri.json` → `ancora_date`). La încărcare și la resetare, aplicația mută toate datele cu (ziua resetării − 1 − ancora), ca demo-ul să pară actual și termenele să rămână corecte. Perioadele lunare ale deșeurilor se mută cu același număr de luni întregi.

## Regenerare

```
python3 gen_seed.py <folder-ieșire>
python3 validate_seed.py <folder-ieșire>
```
