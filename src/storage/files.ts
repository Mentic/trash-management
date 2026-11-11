// R02 — stocare adresată după SHA-256; fișierele nu se modifică după scriere.
import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const dir = () => process.env.FILE_STORAGE_DIR ?? path.join(process.cwd(), "data/files");

export async function storeFile(bytes: Buffer): Promise<{ sha256: string; storageKey: string }> {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const storageKey = `${sha256.slice(0, 2)}/${sha256}`;
  const full = path.join(dir(), storageKey);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes, { flag: "w" });
  return { sha256, storageKey };
}

export const readStoredFile = (storageKey: string) => readFile(path.join(dir(), storageKey));
export const clearStorage = () => rm(dir(), { recursive: true, force: true });

export const ALLOWED_MIME: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", txt: "text/plain",
};
export const MAX_BYTES = 10 * 1024 * 1024;

/** PDF minimal de o pagină, pentru anexele fictive din setul demo. */
export function demoPdf(title: string): Buffer {
  const text = `DEMO - document fictiv: ${title}`.replace(/[()\\]/g, "").normalize("NFD").replace(/[^\x20-\x7e]/g, "");
  const stream = `BT /F1 14 Tf 50 780 Td (${text}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
