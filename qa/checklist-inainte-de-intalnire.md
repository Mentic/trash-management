# Checklist înainte de întâlnire

## Cu 2–3 zile înainte

- [ ] Rulați toate testele din [teste-manuale.md](teste-manuale.md) pe laptopul de prezentare; zero probleme „blochează demo”.
- [ ] Testele automate: `pnpm test` și `node tests/e2e/demo-scenarios.cjs` pe un set proaspăt resetat — toate trec.
- [ ] Exportul CSV deschis în Excel cu setări regionale România (diacritice, coloane).
- [ ] Imprimarea fișei pe A4 verificată.
- [ ] Trei repetiții cronometrate ale [scriptului](demo-showcase.md), sub 15 minute.
- [ ] Înregistrarea video a scriptului complet (1080p), copiată pe laptop și pe stick USB.

## Cu o zi înainte

- [ ] `git pull` + `docker compose -f compose.yml -f compose.local.yml up -d --build`; `http://localhost:3000/api/health` → `"db":"ok"`.
- [ ] Kit demo → Resetează datele demo **fără** „Păstrează înrolările 2FA” (toți neînrolați).
- [ ] Telefonul de demo: ștergeți intrările vechi „ADI Demo” din aplicația de autentificare; ora pe automat.
- [ ] Înrolați **Mihai** și **Elena** pe telefon (păstrați codurile de recuperare); **Ana rămâne neînrolată** pentru momentul live.
- [ ] Nu mai faceți nicio altă modificare în aplicație (numerele trebuie să fie 121, 122, 123/2026).
- [ ] Descărcați din Kit demo `import_2026-10_scenariu_erori.csv` într-un folder ușor de găsit.
- [ ] Trei ferestre de browser pregătite (profiluri separate sau o fereastră privată), zoom 110–125 % pentru proiector.
- [ ] Încărcător laptop și telefon, adaptor HDMI/USB-C, hotspot pe telefon testat.

## În ziua întâlnirii

- [ ] Laptop pornit, Docker pornit, aplicația răspunde; notificările sistemului oprite (mod „Nu deranja”).
- [ ] Login Mihai și Elena în ferestrele lor (codurile din telefon); Ana pe ecranul de login.
- [ ] Banda „DEMO — date fictive” vizibilă.
- [ ] Videoclipul de rezervă deschis într-un tab, pentru orice eventualitate.
- [ ] Dacă se folosește ngrok: `ngrok http 3000` pornit și adresa testată de pe telefon (pagina de avertizare ngrok pe planul gratuit — dați click „Visit Site” înainte de întâlnire).

## După întâlnire

- [ ] Notați întrebările clientului lângă ipotezele I01–I17 din BRD.
- [ ] Resetați datele demo înainte de orice altă prezentare.
