import { spawn } from "node:child_process";

/**
 * Thin wrapper around Calibre's `ebook-convert` binary (decisions.md D5).
 * Stateless: every call spawns a fresh child process, enforces its own
 * timeout (independent of Fastify), and reports a discriminated result so the
 * route can map failures onto the shared error codes.
 */

const EBOOK_CONVERT = "ebook-convert";

export type ConvertOutcome =
  /** Conversion produced the output PDF. */
  | { kind: "ok" }
  /** `ebook-convert` exited non-zero. */
  | { kind: "failed"; code: number | null; stderr: string }
  /** Wall-clock timeout hit; the child was killed. */
  | { kind: "timeout" }
  /** Binary not found on PATH (ENOENT). */
  | { kind: "missing" };

/**
 * Run `ebook-convert <input> <output>` with a hard timeout. On timeout the
 * child (and its tree, best-effort) is killed and `{ kind: "timeout" }` is
 * returned. The promise never rejects — all failure modes are values.
 */
export function runEbookConvert(
  input: string,
  output: string,
  timeoutMs: number,
): Promise<ConvertOutcome> {
  return new Promise<ConvertOutcome>((resolve) => {
    let settled = false;
    const finish = (outcome: ConvertOutcome): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(outcome);
    };

    const child = spawn(EBOOK_CONVERT, [input, output], {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      // Cap retained stderr so a chatty failure can't balloon memory.
      if (stderr.length < 8_192) stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ kind: "timeout" });
    }, timeoutMs);

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        finish({ kind: "missing" });
        return;
      }
      finish({ kind: "failed", code: null, stderr: err.message });
    });

    child.on("close", (code) => {
      if (code === 0) {
        finish({ kind: "ok" });
        return;
      }
      finish({ kind: "failed", code, stderr });
    });
  });
}

/**
 * Startup probe: resolve true iff `ebook-convert --version` runs and exits 0.
 * Never throws; a missing binary (ENOENT) or any error resolves false.
 */
export function isCalibreAvailable(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (available: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(available);
    };

    const child = spawn(EBOOK_CONVERT, ["--version"], { stdio: "ignore" });
    child.on("error", () => done(false));
    child.on("close", (code) => done(code === 0));
  });
}
