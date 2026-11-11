import type { Destination, DispatchChannel, Fraction, IntakeChannel, RequestType, Role, WasteRowStatus } from "@/domain/codes";
export { DOC_STATUS_LABEL } from "@/domain/codes";

export const ROLE_LABEL: Record<Role, string> = { registrar: "Registrator", officer: "Responsabil ADI", director: "Director", mayor: "Primărie" };
export const DIRECTION_LABEL = { incoming: "Intrare", outgoing: "Ieșire", internal: "Intern" } as const;
export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  petition: "Petiție", public_info: "Informații de interes public", institution_letter: "Adresă instituție",
  operator_report: "Raport operator", reply: "Răspuns", internal: "Intern", other: "Altele",
};
export const INTAKE_LABEL: Record<IntakeChannel, string> = {
  email: "E-mail", post: "Poștă", courier: "Curier", hand_delivery: "Predare directă", in_person: "Depunere la sediu",
};
export const DISPATCH_LABEL: Record<DispatchChannel, string> = { email: "E-mail", post: "Poștă", courier: "Curier", hand_delivery: "Predare directă" };
export const FRACTION_LABEL: Record<Fraction, string> = {
  residual: "reziduale", paper_cardboard: "hârtie-carton", plastic_metal: "plastic-metal", glass: "sticlă",
  biowaste: "biodeșeuri", bulky: "voluminoase", other: "altele",
};
export const DESTINATION_LABEL: Record<Destination, string> = {
  sorting: "sortare", mbt: "TMB", composting: "compostare", recycling: "reciclare", other_recovery: "altă valorificare", landfill: "depozitare",
};
export const ROW_STATUS_LABEL: Record<WasteRowStatus, string> = {
  imported: "Importat", flagged: "Semnalat", corrected: "Corectat", excluded: "Exclus", validated: "Validat", approved: "Aprobat",
};
export const RULE_LABEL = { V1: "Format", V2: "Duplicat", V3: "Diferență", V4: "Neatribuit", V5: "UAT necunoscut", V6: "Perioadă închisă" } as const;
