import {
  libraryBookSchema,
  libraryListSchema,
  type LibraryBook,
  type LibrarySort,
} from "@ebook-reader/shared";
import { apiFetch, API_BASE_URL, getAuthToken } from "./api-client";

/**
 * Library API calls (decisions.md D24). Thin wrappers over the Fastify library
 * routes; responses are validated against the shared Zod contract so the
 * client can't drift from the server (D11).
 */

/** `GET /library` — the gallery list, sorted server-side. */
export async function fetchLibrary(sort: LibrarySort): Promise<LibraryBook[]> {
  const res = await apiFetch(`/library?sort=${sort}`);
  return libraryListSchema.parse(await res.json());
}

/** `POST /library` — upload a file; returns the created book. */
export async function uploadBook(file: File): Promise<LibraryBook> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch("/library", { method: "POST", body: form });
  return libraryBookSchema.parse(await res.json());
}

/** `DELETE /library/:id`. */
export async function deleteBook(id: string): Promise<void> {
  await apiFetch(`/library/${id}`, { method: "DELETE" });
}

/** `PATCH /library/:id/progress`. */
export async function updateProgress(id: string, progress: number): Promise<void> {
  await apiFetch(`/library/${id}/progress`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ progress }),
  });
}

/**
 * Absolute URL for a book's cover thumbnail (served from disk, D25). Cover
 * `<img>` tags can't send an `Authorization` header, so when auth is enabled
 * the token rides along as a query param instead (brief 09).
 */
export function coverUrl(id: string): string {
  const url = new URL(`/library/${id}/cover`, API_BASE_URL);
  const token = getAuthToken();
  if (token) {
    url.searchParams.set("token", token);
  }
  return url.toString();
}

/**
 * Fetch a stored book's original bytes as a `File` so the existing readers
 * (which consume an in-memory `File` from Zustand) can render it unchanged.
 */
export async function fetchBookFile(book: LibraryBook): Promise<File> {
  const res = await apiFetch(`/library/${book.id}/file`);
  const blob = await res.blob();
  const ext = book.format;
  const mime = ext === "pdf" ? "application/pdf" : "application/epub+zip";
  const safeName = `${book.title || book.id}.${ext}`.replace(/[/\\]/g, "_");
  return new File([blob], safeName, { type: mime });
}
