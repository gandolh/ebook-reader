import { z } from "zod";

/**
 * File validation for the convert flow — shared by apps/web (pre-upload
 * checks) and apps/api (server-side enforcement).
 *
 * Detection is extension/MIME only, no magic-byte sniffing (decisions.md
 * D13) — spoofing isn't a threat model for a personal, single-user tool.
 */

export const PDF_MIME_TYPES = ["application/pdf"] as const;
export const PDF_EXTENSIONS = [".pdf"] as const;

export const EPUB_MIME_TYPES = ["application/epub+zip"] as const;
export const EPUB_EXTENSIONS = [".epub"] as const;

export const pdfMimeSchema = z.enum(PDF_MIME_TYPES);
export const epubMimeSchema = z.enum(EPUB_MIME_TYPES);

export type PdfMimeType = z.infer<typeof pdfMimeSchema>;
export type EpubMimeType = z.infer<typeof epubMimeSchema>;

/** The two file kinds this app understands (mirrors D12: PDF + EPUB only). */
export const FILE_TYPES = ["pdf", "epub"] as const;
export const fileTypeSchema = z.enum(FILE_TYPES);
export type FileType = z.infer<typeof fileTypeSchema>;

/**
 * Default max upload size in bytes (50MB per D15). The API may override this
 * from `MAX_UPLOAD_MB` — callers should compute their own limit and pass it
 * to `isFileSizeValid` / `maxUploadBytesFromMb` rather than hardcoding this
 * constant everywhere.
 */
export const DEFAULT_MAX_UPLOAD_MB = 50;
export const BYTES_PER_MB = 1024 * 1024;
export const DEFAULT_MAX_UPLOAD_BYTES = DEFAULT_MAX_UPLOAD_MB * BYTES_PER_MB;

/** Convert a megabyte limit (e.g. from `MAX_UPLOAD_MB` env) to bytes. */
export function maxUploadBytesFromMb(maxUploadMb: number): number {
  return maxUploadMb * BYTES_PER_MB;
}

function getExtension(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return name.slice(dotIndex).toLowerCase();
}

/**
 * Classify a file as "pdf" | "epub" | null using its name (extension) and,
 * if provided, its MIME type. Both signals are checked when available; a
 * mismatch between extension and MIME still resolves to null (caller can
 * decide how strict to be — the convert route only accepts EPUB anyway).
 */
export function detectFileType(name: string, mime?: string): FileType | null {
  const ext = getExtension(name);
  const normalizedMime = mime?.toLowerCase();

  const isPdfExt = (PDF_EXTENSIONS as readonly string[]).includes(ext);
  const isEpubExt = (EPUB_EXTENSIONS as readonly string[]).includes(ext);
  const isPdfMime = normalizedMime
    ? (PDF_MIME_TYPES as readonly string[]).includes(normalizedMime)
    : undefined;
  const isEpubMime = normalizedMime
    ? (EPUB_MIME_TYPES as readonly string[]).includes(normalizedMime)
    : undefined;

  if (isPdfExt && (isPdfMime === undefined || isPdfMime)) return "pdf";
  if (isEpubExt && (isEpubMime === undefined || isEpubMime)) return "epub";

  // No usable extension match, but MIME alone is conclusive.
  if (isPdfMime) return "pdf";
  if (isEpubMime) return "epub";

  return null;
}

/** Validate a file size (bytes) against a given limit (bytes, inclusive). */
export function isFileSizeValid(
  sizeBytes: number,
  maxBytes: number = DEFAULT_MAX_UPLOAD_BYTES,
): boolean {
  return sizeBytes >= 0 && sizeBytes <= maxBytes;
}
