import { z } from "zod";

/**
 * Structured JSON error the `/convert` route returns on failure, rendered by
 * the frontend `useMutation` (conversion.md — invalid file, oversize upload,
 * Calibre conversion failure, timeout, or missing Calibre binary).
 */
export const CONVERT_ERROR_CODES = [
  "INVALID_FILE",
  "TOO_LARGE",
  "CONVERT_FAILED",
  "TIMEOUT",
  "CALIBRE_MISSING",
] as const;

export const convertErrorCodeSchema = z.enum(CONVERT_ERROR_CODES);
export type ConvertErrorCode = z.infer<typeof convertErrorCodeSchema>;

export const convertErrorSchema = z.object({
  error: z.string(),
  code: convertErrorCodeSchema,
});

export type ConvertError = z.infer<typeof convertErrorSchema>;
