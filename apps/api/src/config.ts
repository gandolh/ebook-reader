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

export const MAX_UPLOAD_MB = numberFromEnv(
  process.env.MAX_UPLOAD_MB,
  DEFAULT_MAX_UPLOAD_MB,
);
export const MAX_UPLOAD_BYTES = maxUploadBytesFromMb(MAX_UPLOAD_MB);

export const CONVERT_TIMEOUT_MS = numberFromEnv(
  process.env.CONVERT_TIMEOUT_MS,
  60_000,
);
