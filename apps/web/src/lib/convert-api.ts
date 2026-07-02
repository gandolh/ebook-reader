import { convertErrorSchema, type ConvertError } from "@ebook-reader/shared";
import { API_BASE_URL } from "./api-client";

/**
 * `POST /convert` call for the TanStack Query `useMutation` in the uploader
 * (wiki/conversion.md). Deliberately bypasses `apiFetch` (brief 05 note in
 * api-client.ts) because the error path here needs the raw `Response` to
 * parse the shared `convertErrorSchema` JSON body, not just a status code.
 */

/** Thrown on a non-2xx `/convert` response, carrying the parsed structured error when available. */
export class ConvertApiError extends Error {
  readonly code: ConvertError["code"] | "UNKNOWN";

  constructor(message: string, code: ConvertError["code"] | "UNKNOWN") {
    super(message);
    this.name = "ConvertApiError";
    this.code = code;
  }
}

/** Friendly, per-code copy for the convert error UI (falls back to the server message). */
export const CONVERT_ERROR_MESSAGES: Record<ConvertError["code"], string> = {
  INVALID_FILE: "That file isn't a valid EPUB.",
  TOO_LARGE: "File too large (max 50MB).",
  CONVERT_FAILED: "Conversion failed.",
  TIMEOUT: "Conversion timed out.",
  CALIBRE_MISSING: "Calibre isn't available on the server.",
};

/** `book.epub` → `book.pdf` (download filename for a converted EPUB). */
export function pdfFilenameFor(originalName: string): string {
  const base = originalName.replace(/\.epub$/i, "");
  return `${base}.pdf`;
}

/** Trigger a browser download of a blob under the given filename. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Uploads an EPUB `File` and resolves with the converted PDF as a `Blob`. */
export async function convertEpubToPdf(file: File): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(new URL("/convert", API_BASE_URL), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const parsed = convertErrorSchema.safeParse(await response.json().catch(() => null));
    if (parsed.success) {
      throw new ConvertApiError(
        CONVERT_ERROR_MESSAGES[parsed.data.code] ?? parsed.data.error,
        parsed.data.code,
      );
    }
    throw new ConvertApiError("Conversion failed.", "UNKNOWN");
  }

  return response.blob();
}
