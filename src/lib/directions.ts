// „Sens” = direcția documentului față de ADI (R01). Folosit de formular și de server.
import type { Direction, RequestType } from "@/domain/codes";

export const DIRECTION_HELP: Record<Direction, { title: string; text: string; examples: string }> = {
  incoming: {
    title: "Intrare",
    text: "Document primit de ADI din afară.",
    examples: "ex. adresă de la o primărie, petiție, cerere de informații, raportul lunar al operatorului",
  },
  outgoing: {
    title: "Ieșire",
    text: "Document trimis de ADI în afară, din proprie inițiativă.",
    examples: "ex. adresă către AFM sau către o primărie. Răspunsurile la o intrare se înregistrează din fișa intrării („Înregistrează ieșirea”)",
  },
  internal: {
    title: "Intern",
    text: "Document întocmit și folosit în ADI, fără corespondent extern.",
    examples: "ex. decizie a directorului, notă internă, proces-verbal AGA",
  },
};

export const REQUEST_TYPES_BY_DIRECTION: Record<Direction, RequestType[]> = {
  incoming: ["petition", "public_info", "institution_letter", "operator_report", "other"],
  outgoing: ["institution_letter", "other"],
  internal: ["internal"],
};

export const CORRESPONDENT_LABEL: Record<Direction, string> = {
  incoming: "Expeditor (cine a trimis documentul)",
  outgoing: "Destinatar (cui îi trimite ADI documentul)",
  internal: "Corespondent",
};

export const INTERNAL_CORRESPONDENT = "ADI Eco Buzău 2009 (intern)";
