# Teste manuale — Etapa 1

Versiune testată: ______ (commit) · Data: ______ · Tester: ______ · Browser: ______ · Mediu: laptop Docker / server

Coloana **Rezultat**: ✅ trece · ❌ nu trece (notați la final ce s-a întâmplat) · ⏭ nu s-a rulat.

Pregătire: Kit demo → Resetează datele demo (bifat „Păstrează înrolările 2FA” doar dacă testul nu privește înrolarea). Pentru L1, resetați fără bifă sau rulați `docker compose -f compose.yml -f compose.local.yml down -v` și `up -d`.

## 1. Autentificare și 2FA (S01–S08, A08)

| ID | Pași | Rezultat așteptat | BRD | Rezultat |
| --- | --- | --- | --- | --- |
| L1 | Login `ana.registrator` cu parola corectă (sau click pe cardul „Ana — Registrator”; cont neînrolat) | Apare ecranul „Activați autentificarea în doi pași”, cu cod QR și cheia în text, grupată câte 4 caractere | S01, S02 | |
| L1.1 | Scanați QR-ul cu **Google Authenticator** pe telefon | Contul „ADI Demo: ana.registrator” apare în aplicație | S02 | |
| L1.2 | Introduceți `000000` | Mesaj „Codul nu este valid…”, cu numărul de încercări rămase; contul nu devine activ | S02, S05 | |
| L1.3 | Apăsați „Copiază” lângă cheie | Mesajul „Cheia a fost copiată.”; cheia se poate lipi în Microsoft Authenticator (adăugare manuală) | A08 | |
| L2 | Introduceți codul din telefon → „Activează” | Pagina arată doar „✓ Autentificarea în doi pași este activă” și 10 coduri de recuperare `XXXXX-XXXXX`, cu „Imprimă” și „Descarcă” | S04 | |
| L2.1 | „Descarcă” | Se descarcă un `.txt` cu cele 10 coduri; păstrați-l pentru L5 | S04 | |
| L2.2 | „Am salvat codurile — continuă” | Registrul documentelor, cu numele utilizatorului în antet | S02 | |
| L3 | Deconectare → login din nou | Nu mai apare QR-ul; se cere codul de 6 cifre | S03 | |
| L3.1 | Lipiți codul (Ctrl+V) în câmp | Lipirea funcționează; câmpul acceptă și spații | A08 | |
| L3.2 | După autentificare, deconectare → login → introduceți **același** cod (în aceeași fereastră de 30 s) | Refuzat („Codul nu este valid”) — anti-replay | S03 | |
| L4 | Login `mihai.responsabil`, pe ecranul QR introduceți 5 coduri greșite | După al 5-lea: „Contul este blocat până la HH:MM” (acum + 5 min) | S05 | |
| L4.1 | Imediat după blocare, login cu parola corectă | Refuzat, cu același mesaj de blocare | S05 | |
| L4.2 | Așteptați 5 minute, login din nou | Funcționează normal | S05 | |
| L5 | Login Ana → „Folosește un cod de recuperare” → un cod din fișierul L2.1 | Autentificare reușită | S04 | |
| L5.1 | Deconectare, același cod de recuperare | Refuzat | S04 | |
| S07 | Autentificat, nu atingeți aplicația 28 de minute | Apare dialogul „Sesiunea expiră în curând”, cu focus pe „Prelungește sesiunea” | S07, A10 | |
| S07.1 | „Prelungește sesiunea” → încă 30 min fără activitate | La 30 min: redirecționare la login cu „Sesiunea a expirat” | S07 | |
| S08 | Login `elena.director` → Jurnal → categoria Securitate | Apar autentificările reușite și eșuate, înrolările, blocarea și codul de recuperare din pașii de mai sus | S08 | |
| S01.1 | Parolă greșită | „Utilizatorul sau parola nu sunt corecte…”; evenimentul apare în jurnal | S01, S08 | |

## 2. Registratură (R01–R09)

| ID | Pași | Rezultat așteptat | BRD | Rezultat |
| --- | --- | --- | --- | --- |
| R1 | Ana → Registru → „Document nou”: Sens **Intrare** (cardul cu explicație), Tip document Petiție, Corespondent „Ion Popescu (fictiv)”, Număr extern `438/2026`, Obiect oarecare | Sub „Tip document” apare „Termen de răspuns calculat: azi + 30 zile” | R04 | |
| R1.1 | „Confirmă și atribuie număr” → OK la confirmare | Fișa „Intrare 121/2026”, stare Înregistrat, termen = data înregistrării + 30 zile | R01, R06 | |
| R1.2 | Schimbați tipul în formular la „Informații de interes public” (fără salvare) | Termenul calculat devine azi + 10 zile | R04 | |
| R1.3 | Formularul de înregistrare | Nu există niciun câmp CNP | R05 | |
| R1.4 | Alegeți Sens **Ieșire**, apoi **Intern** | Ieșire: dispar canalul de primire și numărul expeditorului; „Destinatar”; fără termen. Intern: dispare corespondentul; tipul este „Intern” | R01 | |
| R1.5 | După confirmare | Mesaj verde „Documentul a fost înregistrat cu numărul …”; bara de pași arată „Înregistrat”; caseta „Pasul următor” spune ce urmează | UX | |
| R1.6 | Registru, ca Ana / Mihai / Elena | Panoul „De lucru” arată cifrele pentru rolul respectiv; click pe o cifră deschide lista filtrată | UX | |
| R2 | Pe 121/2026: Responsabil „Mihai (fictiv)” → „Repartizează” | Stare Repartizat; istoricul arată repartizarea | R2 | |
| R2.1 | Login Mihai (alt browser / fereastră privată) → Registru | Vede 121/2026 și doar lucrările repartizate lui | R07 | |
| R2.2 | Ana: Registru, filtru Responsabil = Nerepartizat → copiați linkul unui document → Mihai deschide linkul | Pagina „nu există” (404) pentru Mihai | R07 | |
| R2.3 | Mihai: „Export CSV” din registru | Fișierul conține doar lucrările lui Mihai | R07 | |
| R3 | Mihai: fișa 121/2026 → scrie răspunsul, bifează „Trimite la aprobare după salvare” → „Salvează” | Stare În aprobare | R3 | |
| R4 | Elena: fișa → „Returnează cu motiv” → motiv „Completați temeiul legal” | Stare În redactare; motivul apare în istoric | R4 | |
| R4.1 | Elena: „Returnează” fără motiv | Nu se poate trimite (câmp obligatoriu) | R4 | |
| R4.2 | Mihai corectează textul și retrimite; Elena → „Aprobă răspunsul” | Stare Aprobat | R4 | |
| R5 | Ana: „Înregistrează ieșirea” | Apare „Document legat: Ieșire 122/2026”; ieșirea are legătura înapoi spre 121/2026 | R06 | |
| R5.1 | Ana: „Consemnează expedierea”, canal E-mail, dovadă `confirmare-0121 (simulată)` | Secțiunea Expediere arată canalul, data și dovada; stare Expediat pe ambele documente | R09 | |
| R5.2 | Încercați expedierea fără dovadă (nici număr, nici fișier) | Mesaj „Adăugați dovada expedierii…” | R09 | |
| R6 | Ana: „Clasează la dosar” fără dosar ales | Nu se poate trimite (dosar obligatoriu) | R03 | |
| R6.1 | Clasați 121/2026 și 122/2026 în „I-1 — Corespondență cu UAT-urile membre” | Ambele: Clasat la dosar; antetul arată dosarul și termenul de păstrare (10 ani) | R03 | |
| R7 | Registru → căutare `438/2026` | Apar 121/2026 și 122/2026; în fișă, istoricul include returnarea cu motiv | R08 | |
| R7.1 | Filtre: Sens = Intrare, Termen = Depășit | Apar 90/2026 și 98/2026 (cele două lucrări depășite intenționat), marcate „! Depășit” (text, nu doar culoare) | R04, A04 | |
| R7.2 | Cu un filtru activ → „Export CSV” → deschideți fișierul în **Excel cu setări românești** | Se deschide direct pe coloane, diacriticele (ș, ț, ă) corecte, exact rândurile filtrate | R08, N04 | |
| R8 | Fișa 121/2026 → „Corectează metadatele”: schimbați Obiectul, motiv obligatoriu | Istoricul arată valoarea veche tăiată → valoarea nouă, autorul, data și motivul | R02 | |
| R8.1 | Fișa unui document cu anexă → descărcați anexa | Se descarcă PDF-ul; nu există nicio opțiune de a modifica sau șterge o anexă | R02 | |
| R9 | Ana: un document nou de test → „Anulează înregistrarea” cu motiv | Stare Anulat; numărul rămâne în registru; următorul document primește numărul următor (nu se reutilizează) | R06 | |
| R10 | Elena: pe o petiție deschisă → „Prelungește termenul” cu 16 zile | Refuzat: „Petițiile se pot prelungi cu cel mult 15 zile în total” | R04 | |
| R11 | Ana: Salvează ciorna (fără confirmare) | Apare în registru ca „Ciornă”, fără număr; Mihai și Elena nu o văd | R06 | |
| R12 | Fișa 121/2026 → „Imprimă fișa” → Print → PDF A4 | O pagină A4, fără meniu și butoane, cu marcajul DEMO | N06 | |
| R13 | Nomenclator | 5 dosare cu indicativ, denumire, termen de păstrare și numărul de documente | R03 | |

## 3. Evidența deșeurilor (D03, D05, D06, D08)

| ID | Pași | Rezultat așteptat | BRD | Rezultat |
| --- | --- | --- | --- | --- |
| D1 | Ana: Document nou, Tip cerere „Raport operator”, Obiect „Raport lunar de activitate – octombrie 2026” → confirmă | Intrarea 123/2026 | D05 | |
| D1.1 | „Clasează fără răspuns” în II-1 | Clasat la dosar | R03 | |
| D2 | Mihai: Import deșeuri → importă fără intrare aleasă | Nu se poate trimite (intrare obligatorie) | D05 | |
| D2.1 | Alegeți 123/2026, fișierul `import_2026-10_scenariu_erori.csv` (Kit demo) → „Importă și verifică” | Raport: 26 rânduri, 1 respins, Duplicat 1, Diferență 1, Neatribuit 1, 22 fără semnalări | D05, D06 | |
| D3 | În raport, secțiunea „Rânduri respinse” | T-2026-002539, regula V1, motiv „cod_ler: format NN NN NN” | V1 | |
| D3.1 | Rândurile semnalate apar primele, cu text („⚑ V3 Diferență 0,050 t…”), nu doar culoare | — | A04 | |
| D4 | Rândul cu „V2 Duplicat” → Exclude → motiv „Duplicat confirmat” | Stare Exclus | D06 | |
| D4.1 | Rândul T-2026-002543 → Corectează (valoarea propusă = tichetul, 0,537) → Salvează corecția | Semnalarea dispare, stare Importat | D06 | |
| D4.2 | „Validează rândurile curate” (rândurile curate nu au butoane proprii) | „23 rânduri validate”; T-2026-002534 (rută comună) rămâne Semnalat | D07 | |
| D4.3 | Corectați un rând fără motiv | Nu se poate trimite (motiv obligatoriu) | D06 | |
| D5 | Elena: Situație pe UAT (2026) | Totaluri doar din curse validate; Nevalidate / Neatribuite / Excluse apar separat, în afara totalurilor | D08 | |
| D5.1 | Click pe totalul Comuna Berca → octombrie 2026 → un tichet | Pagina tichetului: toate câmpurile, cantitate raportat vs tichet, link spre intrarea 123/2026 | D08 | |
| D5.2 | „Neatribuite” | Apare T-2026-002534, rută comună Berca–Cislău fără dovadă | D06 | |
| D5.3 | Filtre UAT = Berca, Fracție = reziduale → Export CSV → Excel românesc | Fișierul conține doar rezultatul filtrat, cu „DEMO — date fictive” pe primul rând | D08, N04 | |
| D7 | Date UAT și calcule, an 2025 | Card Comuna Berca: formula, p = 45 %, Q_mun 877,829 t, Q_val 96,561 t, Q_ob 395,023 t, **C = 14.923 lei**, „Termen 25 ianuarie 2026”, „DEMO — date fictive”, „an aprobat” | D03 | |
| D7.1 | Tabelul pentru celelalte UAT-uri | Râmnicu Sărat 93.793 · Nehoiu 33.518 · Pogoanele 22.758 · Vadu Pașii 13.868 · Cislău 8.216 · Breaza 3.745 lei | D03 | |
| D7.2 | Anul 2026 | Valorile sunt marcate provizoriu (*) | D03 | |
| D8 | Mihai: importă `import_2026-10_test_V5_V6.csv` (legat de 123/2026) | T-2025-999001 respins (V6, an aprobat), T-2026-002552 semnalat (UAT necunoscut), 2 curate | V5, V6 | |
| D9 | Ana: meniul nu are Situație pe UAT / Import; adresa `/waste/summary` tastată direct | Pagina nu există pentru Ana | Matrice acces | |

## 4. Accesibilitate (A02–A04, A07–A09) — Etapa 1

| ID | Pași | Rezultat așteptat | BRD | Rezultat |
| --- | --- | --- | --- | --- |
| A02 | Parcurgeți R1–R6 **doar din tastatură** (Tab, Shift+Tab, Enter, Spațiu, săgeți în liste) | Toate acțiunile se pot face; focusul se vede mereu; nicio capcană | A02 | |
| A02.1 | Pe orice pagină, primul Tab | Apare „Sari la conținut”; Enter duce focusul la conținut | A02 | |
| A03 | NVDA + Firefox: login, fișa unui document, raportul de import | Câmpurile au etichete citite; erorile și rezultatul importului se anunță automat | A03 | |
| A04 | Stările (Depășit, Semnalat, Validat, Anulat) | Au text și/sau pictogramă, nu doar culoare | A04 | |
| A07 | Acțiunile ireversibile (confirmare număr, aprobare, anulare, resetare) | Cer confirmare; câmpurile obligatorii sunt marcate în text | A07 | |
| A09 | Inspect → `<html lang="ro">`; textele | Diacritice ș, ț cu virgulă peste tot | A09 | |
| A05 (Etapa 2, informativ) | Zoom 200 % | Notați problemele; nu blochează Etapa 1 | A05 | |

## 5. Nefuncționale și mediu

| ID | Pași | Rezultat așteptat | BRD | Rezultat |
| --- | --- | --- | --- | --- |
| N01 | Rulați R1–R5 în Chrome, Edge și Firefox (ultimele versiuni) | Funcționează identic | N01 | |
| N03 | Registru: căutare și filtre | Răspuns sub 1 secundă | N03 | |
| N03.1 | Import `import_2026-10_restul_uat_curat.csv` (220 rânduri) | Sub 5 secunde, 220 fără semnalări | N03 | |
| N08 | Reîncărcați orice pagină după o modificare | Modificarea rămâne | N08 | |
| N08.1 | Kit demo → resetare fără „RESETEAZĂ” tastat | Refuzat | N08, A07 | |
| N08.2 | Resetare cu „RESETEAZĂ”, bifat „Păstrează înrolările 2FA” | Redirect la login; registrul are iar 120 de documente; login fără QR | N08 | |
| N09 | Jurnal (Elena) | Evenimentele din teste sunt prezente; nu există nicio acțiune de editare sau ștergere | N09 | |
| ENV1 | `docker compose -f compose.yml -f compose.local.yml down` și `up -d` | Datele rămân; `http://localhost:3000/api/health` răspunde `"db":"ok"` | — | |
| ENV2 | Wi-Fi oprit, aplicația pe laptop | Totul funcționează offline, inclusiv codul QR (generat local) | Kit demo | |

## Probleme găsite

| ID test | Ce s-a întâmplat | Captură / pași | Gravitate (blochează demo / minor) |
| --- | --- | --- | --- |
| | | | |
