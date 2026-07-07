import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { DEFAULT_MAX_UPLOAD_MB, maxUploadBytesFromMb } from "@ebook-reader/shared";

/**
 * Runtime configuration, resolved once from the environment. Falls back to the
 * D15 defaults (50MB / 60s) and the shared byte-limit helper so client and
 * server agree on the ceiling.
 */
function numberFromEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const PORT = numberFromEnv(process.env.PORT, 3001);
export const HOST = process.env.HOST ?? "0.0.0.0";

/**
 * Shared platform password (brief 09). When unset/blank the API is OPEN — the
 * auth guard becomes a no-op. Trimmed so stray whitespace doesn't silently
 * enable auth with a surprising password.
 */
export const APP_PASSWORD = process.env.APP_PASSWORD?.trim() || null;

export const MAX_UPLOAD_MB = numberFromEnv(
  process.env.MAX_UPLOAD_MB,
  DEFAULT_MAX_UPLOAD_MB,
);
export const MAX_UPLOAD_BYTES = maxUploadBytesFromMb(MAX_UPLOAD_MB);

export const CONVERT_TIMEOUT_MS = numberFromEnv(
  process.env.CONVERT_TIMEOUT_MS,
  60_000,
);

/**
 * Library storage roots (decisions.md D24/D25). Everything lives under the
 * API package's `data/` (DB) and sibling dirs, resolved relative to this
 * source file so it's stable regardless of cwd (dev `tsx` vs built `dist/`).
 * All three are gitignored. Override the base with `LIBRARY_DATA_DIR`.
 */
const HERE = dirname(fileURLToPath(import.meta.url)); // apps/api/src (or dist)
const API_ROOT = resolve(HERE, "..");

export const DATA_DIR = process.env.LIBRARY_DATA_DIR
  ? resolve(process.env.LIBRARY_DATA_DIR)
  : resolve(API_ROOT, "data");
export const DB_PATH = resolve(DATA_DIR, "library.db");
/** Original uploaded PDF/EPUB files: `library/<id>.<ext>`. */
export const LIBRARY_FILES_DIR = resolve(API_ROOT, "library");
/** Extracted cover thumbnails: `images/thumbnails/<id>.jpg`. */
export const THUMBNAILS_DIR = resolve(API_ROOT, "images", "thumbnails");
