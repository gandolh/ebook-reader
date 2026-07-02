import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Per-request scratch space for the stateless convert flow (decisions.md D3 —
 * no persistence). A workspace is a unique temp directory holding the uploaded
 * `input.epub` and produced `output.pdf`; `dispose()` removes the whole tree
 * and must run in a `finally` on both success and failure.
 */
export interface TempWorkspace {
  readonly dir: string;
  readonly inputPath: string;
  readonly outputPath: string;
  dispose: () => Promise<void>;
}

export async function createTempWorkspace(): Promise<TempWorkspace> {
  const dir = await mkdtemp(join(tmpdir(), "ebook-convert-"));
  return {
    dir,
    inputPath: join(dir, "input.epub"),
    outputPath: join(dir, "output.pdf"),
    async dispose() {
      await rm(dir, { recursive: true, force: true });
    },
  };
}

/** Strip any directory + extension, returning a safe PDF download filename. */
export function pdfFilenameFor(originalName: string): string {
  const base = originalName.replace(/^.*[\\/]/, "");
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const safe = stem.replace(/["\r\n]/g, "").trim() || "converted";
  return `${safe}.pdf`;
}
