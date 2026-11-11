# Multi-tenant: portalurile primăriilor

**Ce demonstrează:** aplicația este extensibilă dincolo de BRD-ul Etapei 1. Pe lângă personalul ADI, fiecare primărie membră (UAT) devine un *tenant* cu portal propriu: date izolate, conturi proprii și identitate vizuală proprie. Este o extensie de produs, nu o cerință BRD; regulile de business ale Etapei 1 rămân neschimbate.

## Model

| Element | Implementare |
| --- | --- |
| Tenant | o UAT din `uats`: `slug`, `brand_color`, `motto`, `emblem_storage_key` / `emblem_mime` (migrarea `0002_tenants.sql`) |
| Utilizatori ai tenantului | rolul `mayor` („Primărie”) + `users.uat_id`; constrângerea `mayor_has_uat` cere UAT-ul la nivel de bază de date |
| Date ale tenantului | curse (`waste_rows.uat_id`), aprobări anuale, estimarea AFM, corespondența (`documents.uat_id`, dedus din corespondent: „Primăria Comunei Berca” → Comuna Berca) |
| Izolare | `resolveTenant()` (`src/server/queries/tenant.ts`): pentru un cont de primărie tenantul vine **doar din sesiune**; parametrii din URL sunt ignorați. Rolul nu are permisiuni pe registru, deșeuri, jurnal, export sau anexe (`src/server/auth/rbac.ts`) |
| Previzualizare | personalul ADI deschide `/portal?uat=<slug>` (marcat „Previzualizare ADI”) |
| Personalizare | pagina **Primării** (`/tenants`), doar directorul: culoare din paleta tradițională sau proprie (contrast ≥ 4,5:1 verificat), text sub nume, stemă oficială încărcată (PNG/JPG/WEBP/SVG ≤ 1 MB) |
| Stemă implicită | stilizată, generată (`src/lib/emblem.ts`): scut în culoarea primăriei, coroană murală de argint cu 5 turnuri (municipiu), 3 (oraș), 1 (comună). Nu folosim stemele reale fără acordul primăriilor |
| Securitate stemă | servită prin `/api/emblem/<slug>` cu `Content-Security-Policy: sandbox` și `nosniff`; folosită doar în `<img>` |

## Rute

| Rută | Cine | Ce |
| --- | --- | --- |
| `/p/<slug>` | public | pagina de autentificare a primăriei, în culorile și cu stema ei |
| `/portal` | primăria | cantități lunare validate, estimarea AFM, documente în lucru la ADI, corespondența, date UAT |
| `/portal?uat=<slug>` | personal ADI | previzualizare |
| `/tenants` | personal ADI (personalizare: director) | lista primăriilor, linkuri, personalizare |

## Conturi demo

`primaria.<slug>` / `Primarie!2026` — de ex. `primaria.berca`, `primaria.ramnicu-sarat`. Se creează automat la pornire (și pe bazele existente, fără resetare). Prima autentificare cere înrolarea 2FA, ca la ADI.

## Teste

`tests/e2e/tenants.cjs` (în `pnpm test:e2e` și CI): pagina publică, izolarea (URL ignorat, 404 pe zonele și exporturile ADI), previzualizarea, refuzul unei culori fără contrast, personalizarea și stema încărcată. Teste unitare: `tests/unit/tenants.test.ts`.

## Pentru producție (de discutat cu ADI)

Cine administrează conturile primăriilor; ce date vrea să vadă fiecare primărie (ex. și documentele justificative); subdomenii (`berca.portal…`) în loc de `/p/<slug>`; stemele oficiale și acordul de utilizare.
