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
};

const FIELD: Record<string, string> = {
  subject: "Obiect", correspondentName: "Corespondent", correspondentAddress: "Adresă", externalRef: "Număr extern",
  termen: "Termen", responsabil: "Responsabil", detalii: "Detalii", numar: "Număr", dosar: "Dosar", iesire: "Ieșire",
  legat_de: "Legat de", canal: "Canal", data: "Data", dovada: "Dovadă", fileName: "Fișier", sha256: "SHA-256",
};
export const fieldLabel = (k: string) => FIELD[k] ?? k;
