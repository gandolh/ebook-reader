import { z } from "zod";
// Import from the leaf module, not ./index.js, to avoid an import cycle
// (index.js re-exports this file). `fileTypeSchema` === the format enum
// (pdf | epub) — same values as `formatSchema`.
import { fileTypeSchema } from "./file-validation.js";

/**
 * Library book contract (decisions.md D24) — the shape the API returns for a
 * saved book and the client renders as a cover card. Shared so apps/web and
 * apps/api can't drift (D11).
 *
 * The API owns storage (SQLite row + files on disk, D25); this is the *wire*
 * shape only. `filePath`/`coverPath` stay server-side and are NOT exposed —
 * the client fetches bytes via `/library/:id/file` and `/library/:id/cover`.
 */

/** A book as seen by the client (no server-side paths). */
export const libraryBookSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Author, or null when it couldn't be extracted. */
  author: z.string().nullable(),
  format: fileTypeSchema,
  /** Whether a cover thumbnail was extracted (drives fallback tile in the UI). */
  hasCover: z.boolean(),
  /** Original file size in bytes. */
  sizeBytes: z.number().int().nonnegative(),
  /**
   * Reading progress, 0..1, for the CURRENT user (progress is per-user; the
   * library itself is shared). Drives the cover's progress bar — the coarse
   * "how far in", distinct from the exact resume position in `locator`.
   */
  progress: z.number().min(0).max(1),
  /**
   * The current user's exact resume position, or null if they haven't opened
   * the book. Opaque locator: a page number (as a string) for PDF, an epub.js
   * CFI for EPUB. The reader seeds its starting position from this so a refresh
   * / reopen lands back where the user left off.
   */
  locator: z.string().nullable(),
  /** ISO timestamp the book was added. */
  createdAt: z.string(),
  /** ISO timestamp the book was last opened, or null if never opened. */
  lastOpenedAt: z.string().nullable(),
});
export type LibraryBook = z.infer<typeof libraryBookSchema>;

/** `GET /library` response: the gallery list. */
export const libraryListSchema = z.array(libraryBookSchema);

/** `PATCH /library/:id/progress` request body. */
export const updateProgressSchema = z.object({
  progress: z.number().min(0).max(1),
  /** Exact resume position (see `LibraryBook.locator`). Omitted/null leaves the
   * stored locator untouched. */
  locator: z.string().min(1).nullish(),
});
export type UpdateProgressRequest = z.infer<typeof updateProgressSchema>;

/** Sort options for the gallery (mirrors the mockup's "Sort by" control). */
export const LIBRARY_SORTS = ["recent", "title", "author"] as const;
export const librarySortSchema = z.enum(LIBRARY_SORTS);
export type LibrarySort = z.infer<typeof librarySortSchema>;
