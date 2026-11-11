# QA — teste manuale și demo

| Fișier | Când se folosește |
| --- | --- |
| [teste-manuale.md](teste-manuale.md) | Înainte de fiecare versiune livrată și înainte de întâlnire: toate cazurile de test, cu rezultatul așteptat și cerința BRD |
| [demo-showcase.md](demo-showcase.md) | Scriptul de 15 minute pentru întâlnire, pas cu pas, cu ce se spune și ce se arată |
| [checklist-inainte-de-intalnire.md](checklist-inainte-de-intalnire.md) | Cu o zi înainte și în ziua întâlnirii |

**Ce acoperă testele automate și ce rămâne manual**

| Verificat automat (`tests/e2e/demo-scenarios.cjs`, `pnpm test`) | Doar manual (acest folder) |
| --- | --- |
| Fluxurile L1–L2, R1–R8, D1–D5, D7, S08, N08; regulile V1–V6, AFM, termene, TOTP | Scanarea QR cu un telefon real; Excel cu setări românești; imprimarea A4; NVDA; doar tastatură; zoom 200 %; Chrome / Edge / Firefox; expirarea sesiunii la 30 min; blocarea de 5 minute în timp real; rularea în Docker pe laptop |

Toate testele pornesc de la un **set demo proaspăt resetat** (Kit demo → Resetează datele demo). Numerele 121, 122, 123/2026 apar doar în această ordine, pe un set proaspăt.

Conturi demo: `ana.registrator` / `Registru!2026` · `mihai.responsabil` / `Deseuri!2026` · `elena.director` / `Aprobare!2026`.
