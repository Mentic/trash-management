export const HISTORY_LABEL: Record<string, string> = {
  "document.ciorna_salvata": "Ciornă salvată",
  "document.confirmat": "Înregistrat (număr atribuit)",
  "document.repartizat": "Repartizat",
  "document.raspuns_salvat": "Răspuns redactat",
  "document.trimis_la_aprobare": "Trimis la aprobare",
  "document.returnat": "Returnat",
  "document.aprobat": "Aprobat",
  "document.iesire_inregistrata": "Ieșire înregistrată",
  "document.expediat": "Expediat",
  "document.clasat": "Clasat la dosar",
  "document.clasat_fara_raspuns": "Clasat fără răspuns",
  "document.anulat": "Anulat",
  "document.corectat": "Metadate corectate",
  "document.termen_prelungit": "Termen prelungit",
  "document.anexa_adaugata": "Anexă adăugată",
  "document.ciorna_stearsa": "Ciornă ștearsă",
  "dosar.adaugat": "Dosar adăugat în nomenclator",
  "auth.password_ok": "Parolă corectă",
  "auth.password_failed": "Parolă greșită",
  "auth.mfa_enrolled": "2FA activat (cod QR)",
  "auth.mfa_ok": "Cod 2FA corect — autentificat",
  "auth.mfa_failed": "Cod 2FA greșit",
  "auth.locked": "Cont blocat 5 minute",
  "auth.recovery_used": "Cod de recuperare folosit",
  "auth.mfa_reset": "2FA resetat",
  "auth.logout": "Deconectare",
  "auth.session_expired": "Sesiune expirată",
  "waste.import": "Import CSV",
  "waste.row.excluded": "Rând exclus din calcul",
  "waste.row.corrected": "Rând corectat",
  "waste.row.attributed": "UAT atribuit rândului",
  "waste.row.reactivated": "Rând reactivat",
  "waste.rows.validated": "Rânduri validate",
  "demo.reset": "Date demo resetate",
};

const FIELD: Record<string, string> = {
  subject: "Obiect", correspondentName: "Corespondent", correspondentAddress: "Adresă", externalRef: "Număr extern",
  termen: "Termen", responsabil: "Responsabil", detalii: "Detalii", numar: "Număr", dosar: "Dosar", iesire: "Ieșire",
  legat_de: "Legat de", canal: "Canal", data: "Data", dovada: "Dovadă", fileName: "Fișier", sha256: "SHA-256",
  fisier: "Fișier", intrare: "Intrare", total: "Total", respinse: "Respinse", semnalate: "Semnalate", curate: "Curate",
  randuri: "Rânduri", reportedKg: "Raportat (kg)", ticketKg: "Tichet (kg)", uat: "UAT", status: "Stare",
  anchorShiftedTo: "Ancora mutată la", keepMfa: "Înrolări 2FA păstrate", dayShift: "Zile mutate", monthShift: "Luni mutate",
  code: "Indicativ", title: "Denumire", retention: "Termen de păstrare",
};

/** „Cheie: valoare” lizibil pentru jurnal. */
export function describeValues(v: unknown): string {
  if (!v || typeof v !== "object") return "";
  return Object.entries(v as Record<string, unknown>)
    .filter(([k]) => k !== "sha256")
    .map(([k, x]) => `${fieldLabel(k)}: ${x === true ? "da" : x === false ? "nu" : x ?? "—"}`)
    .join(" · ");
}
export const fieldLabel = (k: string) => FIELD[k] ?? k;
