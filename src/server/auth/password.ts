// S01 — Argon2id (parametri OWASP: 19 MiB, 2 iterații, paralelism 1).
import { hash, verify } from "@node-rs/argon2";

const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashSecret = (plain: string) => hash(plain, OPTS);

let dummy: Promise<string> | null = null;

/** Verifică și pentru utilizatori inexistenți (hash fictiv), ca timpul să nu dezvăluie conturile. */
export async function verifySecret(hashed: string | null | undefined, plain: string): Promise<boolean> {
  if (!hashed) {
    dummy ??= hashSecret("parola-fictiva-pentru-timp-constant");
    await verify(await dummy, plain).catch(() => false);
    return false;
  }
  return verify(hashed, plain).catch(() => false);
}
