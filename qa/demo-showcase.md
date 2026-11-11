# Demo — scriptul de 15 minute

**Scop:** clientul pleacă convins că aplicația rezolvă două obligații reale (registratura și controlul raportului operatorului, art. 5 alin. (1) lit. g¹ din proiectul de statut) și vrea un contract. Prezentați-o explicit ca **prototip pe date fictive**, cu UAT-urile lor reale.

**Pregătire:** setul resetat cu o zi înainte (vezi checklist); Mihai și Elena înrolați pe telefonul de demo, **Ana neînrolată**; trei ferestre de browser (sau profiluri): Ana, Mihai, Elena; fișierul `import_2026-10_scenariu_erori.csv` descărcat din Kit demo.

## Desfășurare

| Minut | Cine | Ce faceți (clicuri) | Ce spuneți | Momentul „wow” |
| --- | --- | --- | --- | --- |
| 0–2 | — | Ecranul de login, banda „DEMO — date fictive” | „Un registru unic pentru intrări, ieșiri și interne, plus verificarea raportului operatorului — instrumentul pentru procedura de control din noul statut. Totul găzduit în UE.” | — |
| 2–4 | Ana | Login → **codul QR se scanează live** cu telefonul → codul de 6 cifre → cele 10 coduri de recuperare | „Autentificare în doi pași, ca la bancă. Fără SMS, fără costuri, merge cu orice aplicație de autentificare.” | 1 |
| 4–5 | Ana | Document nou: Petiție, Număr extern **438/2026**, obiect → arătați „Termen calculat” → Confirmă | „Numărul se dă o singură dată, atomic, și nu se refolosește. Termenul legal se calculează singur.” → **121/2026** | 2 |
| 5–6 | Ana | Repartizează lui Mihai | „Fiecare vede doar ce trebuie: Mihai nu poate deschide nici prin link o lucrare care nu e a lui.” | 2 |
| 6–7 | Mihai | Fișa 121 → scrie răspunsul → bifează „Trimite la aprobare” → Salvează | — | 2 |
| 7–8 | Elena | „Returnează cu motiv”: *Completați temeiul legal* → Mihai corectează și retrimite → Elena „Aprobă răspunsul” | „Motivul rămâne în istoric, cu autor și oră.” | 2 |
| 8–9 | Ana | „Înregistrează ieșirea” (**122/2026**, legată) → „Consemnează expedierea” cu dovadă → Clasează în I-1 → căutare **438/2026** | „Căutați după numărul expeditorului și găsiți intrarea, răspunsul și tot istoricul.” | 2 |
| 9–10 | Ana | Document nou: Raport operator, octombrie 2026 → **123/2026** → Clasează fără răspuns în II-1 | „Raportul operatorului intră în registratură ca orice document.” | — |
| 10–12 | Mihai | Import deșeuri → intrarea 123/2026 + fișierul de scenariu → **raportul apare pe loc**: 1 respins, 1 duplicat, 1 diferență 0,050 t, 1 rută comună neatribuită → Exclude duplicatul → Corectează diferența după tichet → „Validează rândurile curate” | „Aici e procedura de control: raportul operatorului verificat față de tichete, automat. Nimic semnalat nu intră în totaluri.” | 3 |
| 12–13 | Elena | Situație pe UAT → **click pe totalul Comuna Berca → octombrie → tichetul** | „Orice cifră din situație o puteți urmări până la tichetul de cântar și până la raportul înregistrat.” | 4 |
| 13 | Elena | Export CSV → deschis în Excel | „Se deschide direct în Excel, cu diacritice.” | 5 |
| 13–15 | Elena | Date UAT și calcule, 2025, Comuna Berca: formula, intrările, **14.923 lei**, termenul de 25 ianuarie | „Estimarea contribuției la Fondul pentru mediu, cu formula la vedere — datele susțin declarația UAT-ului. Valorile sunt fictive.” Apoi: ce urmează (Etapa 2 după semnare, întrebările I01–I17). | 5 |

## Mesaje cheie

- **Prototip**, nu produs terminat: arată direcția și ritmul; detaliile (nomenclator, termene, toleranțe) se configurează după răspunsurile lor (ipotezele I01–I17).
- **Datele lor:** cele 7 UAT-uri reale, populația reală; cantitățile, persoanele și documentele sunt fictive.
- **Control și urme:** fiecare modificare are autor, oră, valoare veche și nouă, motiv; anexele nu se pot modifica.
- **Găzduire în UE / la ei:** rulează în Docker, pe orice server, inclusiv on-prem.

## Subiect sensibil

Estimarea AFM arată **toate cele 7 UAT-uri datorând contribuție** (3.745 – 93.793 lei). Spuneți explicit că cifrele sunt fictive și servesc la demonstrarea calculului; nu comentați situația reală a vreunei primării.

## Dacă ceva nu merge

| Problemă | Ce faceți |
| --- | --- |
| Codul TOTP este refuzat | Verificați ora telefonului (automată); așteptați codul următor — un cod deja folosit este refuzat intenționat (anti-replay). |
| Ana s-a blocat după 5 coduri greșite | Continuați cu Mihai sau Elena (deja înrolați); blocarea durează 5 minute. |
| Numerele nu sunt 121/122/123 | Setul nu a fost resetat sau ordinea a fost alta; continuați — logica e aceeași. Spuneți numărul afișat. |
| Rețeaua clientului nu merge | Rulați local (`docker compose … up -d`) — totul merge offline; sau hotspot de pe telefon. |
| Aplicația nu pornește | Treceți la înregistrarea video a scriptului (pe laptop și pe stick). |
