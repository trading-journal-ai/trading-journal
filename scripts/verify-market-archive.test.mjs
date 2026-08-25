import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectRawMinuteArchive } from "./verify-market-archive.mjs";

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("raw minute archive verification", () => {
  it("records stable content evidence across nested provider directories", async () => {
    const directory = mkdtempSync(join(tmpdir(), "market-archive-raw-"));
    temporaryDirectories.push(directory);
    mkdirSync(join(directory, "2026", "08"), { recursive: true });
    writeFileSync(join(directory, "2026", "08", "2026-08-24.csv.gz"), "minute-one");
    writeFileSync(join(directory, "2026", "08", "2026-08-25.csv.gz"), "minute-two");

    const first = await inspectRawMinuteArchive(directory);
    const second = await inspectRawMinuteArchive(directory);

    expect(first).toEqual(second);
    expect(first).toMatchObject({ bytes: 20, files: 2 });
    expect(first.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
