import { chmod, mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { clearStorage } = await import("@/storage/files");

// În Docker, FILE_STORAGE_DIR (/data/files) este punctul de montare al unui volum, iar /data aparține lui root:
// directorul în sine nu poate fi șters, doar conținutul lui.
describe("clearStorage", () => {
  let parent: string;
  let storage: string;

  beforeEach(async () => {
    parent = await mkdtemp(path.join(tmpdir(), "storage-test-"));
    storage = path.join(parent, "files");
    await mkdir(path.join(storage, "ab"), { recursive: true });
    await writeFile(path.join(storage, "ab", "abcdef"), "x");
    await writeFile(path.join(storage, "loose.txt"), "y");
    await chmod(parent, 0o555);
    vi.stubEnv("FILE_STORAGE_DIR", storage);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await chmod(parent, 0o755);
    await rm(parent, { recursive: true, force: true });
  });

  it("golește directorul fără a încerca să-l șteargă", async () => {
    await clearStorage();
    expect((await stat(storage)).isDirectory()).toBe(true);
    expect(await readdir(storage)).toEqual([]);
  });

  it("creează directorul dacă lipsește", async () => {
    await chmod(parent, 0o755);
    await rm(storage, { recursive: true });
    await clearStorage();
    expect(await readdir(storage)).toEqual([]);
  });
});
