---
name: ux
description: Sistemul vizual și regulile de UX ale aplicației ADI Eco Buzău (Next.js + Tailwind 4 + shadcn/ui pe Radix + lucide-react + sonner). Folosește-l ÎNAINTE de orice modificare de interfață — ecran nou, formular, tabel, buton, dialog, mesaj, text afișat utilizatorului, culori sau iconițe — și când se cere „UI mai frumos”, „mai user friendly” sau o revizuire UX. Conține tokenurile, componentele existente, tiparele de pagină, regulile de text în română, accesibilitatea (WCAG 2.1 AA) și pașii de verificare cu capturi.
---

# UX — Registratură și evidența deșeurilor

Aplicația e un instrument de lucru pentru un ADI (registrator, responsabil, director), prezentat clientului ca demo de 15 minute. Ținta: **fiecare ecran spune ce s-a întâmplat și ce urmează**, arată profesionist pe proiector și rămâne accesibil (WCAG 2.1 AA, cerințele A01–A11 din `docs/brd/BRD_v2.2.md`).

## Principii (în ordinea priorității)

1. **Pasul următor e evident.** O singură acțiune principală pe ecran/stare (buton `default`); restul secundare (`outline`) sau grupate sub „Alte acțiuni”. Caseta „Pasul următor” (`nextStep` în `src/components/flow.tsx`) se adaptează rolului.
2. **Feedback după fiecare acțiune.** Server Action-ul face `redirect(...?ok=<cheie>)`; textul se construiește în `src/lib/messages.ts` din date reale („Lucrarea 121/2026 a fost repartizată lui Mihai”). `SuccessBanner` îl afișează în pagină (`role="status"`) și declanșează și un toast `sonner`.
3. **Erorile spun cum se corectează**, lângă câmp sau formular, în `aria-live`. Niciodată eroare 500 pentru o greșeală de utilizator: validează (Zod / reguli din `src/domain`) și întoarce `{ error }`.
4. **Ireversibilul cere confirmare** în dialog Radix: `ActionForm confirm="…"` sau `useConfirm()` (`src/components/useConfirm.tsx`). Nu folosi `window.confirm`.
5. **Explică termenii de domeniu** acolo unde apar (ex. cardurile „Sens” cu exemple în `NewDocumentForm`). Câmpurile se adaptează contextului (ex. „Expeditor” vs „Destinatar”).
6. **Datele demo sunt marcate** „DEMO — date fictive” (banda din `layout.tsx`, insignă pe calcule).

## Tokenuri (definite în `src/app/globals.css`)

| Token | Valoare | Utilizare |
| --- | --- | --- |
| `--accent` | `#0f766e` (teal-700) | acțiune principală, focus, pagina activă — contrast 5,5:1 pe alb |
| `--accent-hover` | `#115e59` | hover pe principal |
| `--accent-soft` | `#f0fdfa` | fundaluri de evidențiere |
| `--paper` | `#f6f8fa` | fundalul paginii; conținutul stă pe carduri albe |
| `--ink` | `#0f172a` | text |
| `--demo` / `--demo-bg` | ambră | marcajul demo |

Neutrele sunt `slate-*` din Tailwind. Tonuri semantice (insigne, carduri statistice): `gray`, `blue` (informativ / nou), `amber` (atenție / în lucru), `red` (blocat / depășit / semnalat), `green` (gata / validat). **Nu introduce hex-uri noi în componente**; adaugă un token dacă e nevoie.

Font: Inter Variable (`@fontsource-variable/inter`, local — demo-ul trebuie să meargă offline). Titlu pagină `text-2xl font-semibold tracking-tight`; titlu card `text-base font-semibold`; text `text-sm`; ajutor `text-xs text-slate-600`. Cifre în tabele/statistici: `tabular-nums`.

Forme: carduri `rounded-xl border-slate-200 bg-white shadow-sm p-5`; butoane și câmpuri `rounded-lg`; insigne `rounded-full`; dialoguri `rounded-2xl shadow-2xl`.

## Componente existente — folosește-le, nu le reinventa

| Componentă | Fișier | Note |
| --- | --- | --- |
| `Button`, `buttonVariants` | `src/components/ui/button.tsx` | variante `default · outline · secondary · ghost · destructive · link`; mărimi `sm · md · lg · icon`. `btn` / `btnPrimary` din `ui.tsx` sunt scurtături |
| `AlertDialog` | `src/components/ui/alert-dialog.tsx` | Radix: focus captiv, Escape, revenirea focusului |
| `ActionForm` | `src/components/ActionForm.tsx` | formular pentru Server Action: eroare/ok, `confirm`, `destructive` |
| `useConfirm` | `src/components/useConfirm.tsx` | confirmare pe formulare proprii; mesajul poate depinde de butonul apăsat |
| `PageTitle`, `Card`, `Field`, `Badge`, `Stat`, `Notice`, `Crumbs`, `th`, `td`, `input` | `src/components/ui.tsx` | `Stat` are `data-stat`/`data-value` pentru teste |
| `DocStatusBadge`, `RowStatusBadge`, `Deadline` | `src/components/badges.tsx` | stări cu text + pictogramă, nu doar culoare (A04) |
| `Stepper`, `nextStep`, `SuccessBanner` | `src/components/flow.tsx` | circuitul documentului și feedbackul |
| `FileInput` | `src/components/FileInput.tsx` | buton în română, limite 10 MB / 50 MB verificate înainte de trimitere |
| `NavLinks` | `src/components/NavLinks.tsx` | meniu cu iconițe, `aria-current="page"` |
| `SessionTimer` | `src/components/SessionTimer.tsx` | avertizare S07; activitatea = tastare/click/derulare |
| `Toaster`, `ToastOnMount` | `src/components/Toast.tsx` | toast-uri sonner |

**Componentă shadcn nouă:** registrul shadcn poate fi indisponibil în mediul de lucru; scrie componenta manual în `src/components/ui/<nume>.tsx` după modelul shadcn (primitive din `radix-ui`, clase cu `cn()` din `src/lib/utils.ts`, variante cu `cva`). Fixează versiunile exact în `package.json`.

Iconițe: `lucide-react`, `size-4` în butoane și meniu, `size-5` în titluri/casete, mereu `aria-hidden` când există text alăturat.

## Tipare de pagină

- **Listă**: `PageTitle` (cu acțiunea principală în dreapta) → panou rezumat/„De lucru” (carduri cu cifră, etichetă, explicație, link spre lista filtrată) → filtre într-un card alb (filtrele stau în URL) → tabel (`caption`, `th scope="col"`, `aria-sort`) → paginare. Stare goală: propoziție + acțiune („Resetează filtrele”).
- **Fișă/detaliu**: firimituri → titlu → `Stepper` → insigne + metadate → grilă 2/3 conținut + 1/3 „Pasul următor” și acțiuni. Istoricul arată nume afișate, valoarea veche tăiată → valoarea nouă, motivul.
- **Formular**: etichete vizibile; „(obligatoriu)” în etichetă; ajutor sub câmp; câmpurile irelevante pentru context se ascund, nu se dezactivează; butonul principal primul.
- **Raport/import**: cifre mari în `Stat` → caseta „Pasul următor” → problemele primele în tabel, cu acțiunile doar pe rândurile care le cer.

## Text (română)

- Diacritice corecte: **ș, ț cu virgulă** (nu ş, ţ cu sedilă). Date `ZZ.LL.AAAA`, sume `14.923 lei`, cantități `1.234,567 t` (helperii din `src/lib/format.ts`).
- Persoana a II-a plural, politicos, scurt: „Alegeți dosarul”, „Completați motivul”.
- Butoane = verb + obiect: „Înregistrează ieșirea”, nu „OK”. Confirmări: „Da, continuă” / „Renunță”.
- Nicio etichetă în engleză (inclusiv butonul nativ de fișiere — folosește `FileInput`).
- Etichetele de stare vin din `src/lib/labels.ts` / `src/domain/codes.ts`; acțiunile de jurnal din `src/lib/history.ts`. Nu afișa coduri tehnice (`waste.row.excluded`) sau JSON.

## Accesibilitate (verifică la fiecare schimbare)

- Totul se poate face din tastatură; focus vizibil (`outline` teal); „Sari la conținut” rămâne primul element.
- Fiecare câmp are `<label>`; erorile legate cu `aria-describedby` sau anunțate în `aria-live`.
- Dialogurile sunt Radix (`AlertDialog`); focusul intră în dialog la deschidere (`onOpenAutoFocus`).
- Culoarea nu e singurul purtător de informație: text + pictogramă.
- Contrast ≥ 4,5:1 pentru text, ≥ 3:1 pentru componente.
- `lang="ro"` pe `<html>`.

## Nu face

- `window.confirm` / `alert`; hex-uri în componente; text în engleză; tabele fără antet; mai multe butoane principale în același loc; acțiuni ascunse doar prin culoare; animații care blochează (folosește `tw-animate-css`, scurte).
- Nu schimba textele pe care se bazează testele fără să actualizezi `tests/e2e/*.cjs` (ex. „Da, continuă”, „Pasul următor”, mesajele din `messages.ts`). Pentru selectoare stabile folosește `data-*`, nu clase CSS.

## Verificare (obligatoriu înainte de commit)

1. `pnpm typecheck && pnpm test && pnpm build`.
2. `pnpm test:e2e` (cu `PG_ADMIN_BASE` și `APP_RW_PASSWORD`, vezi README) — trebuie să treacă toate suitele.
3. **Capturi**: pornește build-ul standalone, parcurge ecranele atinse cu Playwright (`page.screenshot({ fullPage: true })`, 1280×800, plus 390 px lățime pentru un ecran de listă) și **uită-te la ele** — aliniere, spațiere, texte tăiate, contrast, ce se vede „deasupra pliului”.
4. Actualizează `qa/teste-manuale.md` dacă s-au schimbat etichete sau pași, și `qa/demo-showcase.md` dacă e afectat scriptul demo.
