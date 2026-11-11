// Sec. 4–5: maparea codurilor din setul demo și din CSV (română) spre codurile interne (engleză).
// Singurul loc unde se face această traducere: folosit de import, export și loader.

export const DOC_STATUSES = [
  "draft", "registered", "assigned", "drafting", "in_approval",
  "approved", "outgoing_registered", "dispatched", "filed", "cancelled",
] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export const SEED_DOC_STATUS: Record<string, DocStatus> = {
  ciorna: "draft",
  inregistrat: "registered",
  repartizat: "assigned",
  in_redactare: "drafting",
  in_aprobare: "in_approval",
  aprobat: "approved",
  iesire_inregistrata: "outgoing_registered",
  expediat: "dispatched",
  clasat: "filed",
  anulat: "cancelled",
};

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  draft: "Ciornă",
  registered: "Înregistrat",
  assigned: "Repartizat",
  drafting: "În redactare",
  in_approval: "În aprobare",
  approved: "Aprobat",
  outgoing_registered: "Ieșire înregistrată",
  dispatched: "Expediat",
  filed: "Clasat la dosar",
  cancelled: "Anulat",
};

export const DIRECTIONS = ["incoming", "outgoing", "internal"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export const SEED_DIRECTION: Record<string, Direction> = { intrare: "incoming", iesire: "outgoing", intern: "internal" };

export const REQUEST_TYPES = [
  "petition", "public_info", "institution_letter", "operator_report", "reply", "internal", "other",
] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];
export const SEED_REQUEST_TYPE: Record<string, RequestType> = {
  petitie: "petition",
  informatii_publice: "public_info",
  adresa_institutie: "institution_letter",
  raport_operator: "operator_report",
  raspuns: "reply",
  intern: "internal",
  altele: "other",
};

export const INTAKE_CHANNELS = ["email", "post", "courier", "hand_delivery", "in_person"] as const;
export type IntakeChannel = (typeof INTAKE_CHANNELS)[number];
export const SEED_INTAKE_CHANNEL: Record<string, IntakeChannel> = {
  "e-mail": "email",
  "poștă": "post",
  curier: "courier",
  "predare directă": "hand_delivery",
  "depunere la sediu": "in_person",
};

export const DISPATCH_CHANNELS = ["email", "post", "courier", "hand_delivery"] as const;
export type DispatchChannel = (typeof DISPATCH_CHANNELS)[number];

export const ROLES = ["registrar", "officer", "director"] as const;
export type Role = (typeof ROLES)[number];
export const SEED_ROLE: Record<string, Role> = { registrator: "registrar", responsabil: "officer", director: "director" };

export const FRACTIONS = ["residual", "paper_cardboard", "plastic_metal", "glass", "biowaste", "bulky", "other"] as const;
export type Fraction = (typeof FRACTIONS)[number];
export const CSV_FRACTION: Record<string, Fraction> = {
  reziduale: "residual",
  "hârtie-carton": "paper_cardboard",
  "plastic-metal": "plastic_metal",
  "sticlă": "glass",
  "biodeșeuri": "biowaste",
  voluminoase: "bulky",
  altele: "other",
};

export const DESTINATIONS = ["sorting", "mbt", "composting", "recycling", "other_recovery", "landfill"] as const;
export type Destination = (typeof DESTINATIONS)[number];
export const CSV_DESTINATION: Record<string, Destination> = {
  sortare: "sorting",
  TMB: "mbt",
  compostare: "composting",
  reciclare: "recycling",
  "altă valorificare": "other_recovery",
  depozitare: "landfill",
};

export const WASTE_ROW_STATUSES = ["imported", "flagged", "corrected", "excluded", "validated", "approved"] as const;
export type WasteRowStatus = (typeof WASTE_ROW_STATUSES)[number];
export const SEED_WASTE_STATUS: Record<string, WasteRowStatus> = { aprobat: "approved", validat: "validated" };

export const WASTE_RULES = ["V1", "V2", "V3", "V4", "V5", "V6"] as const;
export type WasteRule = (typeof WASTE_RULES)[number];
