// Mesajele de confirmare după o acțiune (cheia vine în ?ok=…; textul se construiește pe server, din datele reale).
type Ctx = { num: string; assignee?: string | null; linked?: string | null; dossier?: string | null; n?: string };

const DOC: Record<string, (c: Ctx) => string> = {
  confirmed: (c) => `Documentul a fost înregistrat cu numărul ${c.num}.`,
  draft: () => "Ciorna a fost salvată. Numărul se atribuie la confirmare.",
  assigned: (c) => `Lucrarea ${c.num} a fost repartizată lui ${c.assignee ?? "responsabil"}.`,
  reply: () => "Răspunsul a fost salvat. Îl puteți trimite la aprobare când este gata.",
  submitted: () => "Răspunsul a fost trimis la aprobare.",
  returned: (c) => `Răspunsul a fost returnat lui ${c.assignee ?? "responsabil"}, cu motivul în istoric.`,
  approved: () => "Răspunsul a fost aprobat. Registratura poate înregistra ieșirea.",
  outgoing: (c) => `Ieșirea ${c.linked ?? ""} a fost înregistrată și legată de ${c.num}.`,
  dispatched: () => "Expedierea a fost consemnată, cu dovada în fișă.",
  filed: (c) => `Documentul ${c.num} a fost clasat${c.dossier ? ` în dosarul ${c.dossier}` : ""}.`,
  cancelled: (c) => `Înregistrarea ${c.num} a fost anulată. Numărul rămâne în registru.`,
  corrected: () => "Corecția a fost salvată; istoricul păstrează valoarea veche și motivul.",
  extended: () => "Termenul a fost prelungit.",
  attachments: () => "Anexele au fost adăugate.",
};

export const docMessage = (key: string | undefined, c: Ctx) => (key && DOC[key] ? DOC[key](c) : null);

const WASTE: Record<string, (n?: string) => string> = {
  excluded: () => "Rândul a fost exclus din calcul.",
  corrected: () => "Corecția a fost salvată și verificările au fost reluate.",
  assigned: () => "UAT-ul a fost atribuit și verificările au fost reluate.",
  reactivated: () => "Rândul a fost reactivat.",
  validated: (n) => `${n} ${n === "1" ? "rând validat" : "rânduri validate"}.`,
};
export const wasteMessage = (key: string | undefined, n?: string) => (key && WASTE[key] ? WASTE[key](n) : null);
