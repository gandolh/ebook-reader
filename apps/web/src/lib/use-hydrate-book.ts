import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LibraryBook } from "@ebook-reader/shared";

import { useReaderStore } from "../store/reader-store";
import { fetchBookFile, fetchLibrary } from "./library-api";

/**
 * Load the reader's `File` from the library for `/read?book=<id>` — both the
 * cover-card click (which navigates here immediately, brief 10) and a refresh /
 * direct visit (D24) go through this single path. The open `File` lives only in
 * memory; the book id in the URL lets us (re-)fetch it. No-op when the right
 * file is already loaded or there's no `book` id (dev samples).
 *
 * Exposes download `progress` (0–1; `null` = indeterminate) so the route can
 * show a real opening screen, the matched `book` row (title/cover for that
 * screen), and `retry` for the error state.
 */
export type HydrateStatus = "idle" | "loading" | "not-found" | "error";

export interface HydrateState {
  status: HydrateStatus;
  /** Download progress 0–1; `null` while indeterminate or not downloading. */
  progress: number | null;
  /** The library row being opened, once the list is known. */
  book: LibraryBook | null;
  /** Re-attempt after `status === "error"`. */
  retry: () => void;
}

export function useHydrateBook(bookId: string | undefined): HydrateState {
  const loadedFile = useReaderStore((s) => s.loadedFile);
  const loadedBookId = useReaderStore((s) => s.loadedBookId);
  const setLoadedBook = useReaderStore((s) => s.setLoadedBook);
  const [status, setStatus] = useState<HydrateStatus>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  // Bumping this re-runs the fetch effect after a failure.
  const [attempt, setAttempt] = useState(0);

  // Only fetch the library when we actually need to hydrate: a book id in the
  // URL that isn't already the loaded book.
  const needsHydrate = Boolean(bookId) && (!loadedFile || loadedBookId !== bookId);

  const library = useQuery({
    queryKey: ["library", "recent"],
    queryFn: () => fetchLibrary("recent"),
    enabled: needsHydrate,
  });

  const book = useMemo(
    () => library.data?.find((b) => b.id === bookId) ?? null,
    [library.data, bookId],
  );

  useEffect(() => {
    if (!needsHydrate || !bookId) {
      setStatus("idle");
      return;
    }
    if (library.isPending) {
      setStatus("loading");
      return;
    }
    if (library.isError) {
      setStatus("error");
      return;
    }
    const found = library.data?.find((b) => b.id === bookId);
    if (!found) {
      setStatus("not-found");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setProgress(found.sizeBytes > 0 ? 0 : null);
    fetchBookFile(found, (fraction) => {
      if (!cancelled) setProgress(fraction);
    })
      .then((file) => {
        if (!cancelled) setLoadedBook(file, found.format, found.id);
      })
      .catch(() => {
        if (!cancelled) {
          setProgress(null);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [needsHydrate, bookId, library.isPending, library.isError, library.data, setLoadedBook, attempt]);

  const retry = useCallback(() => {
    // The failure may have been the library list itself — refetch it too.
    if (library.isError) void library.refetch();
    setAttempt((a) => a + 1);
  }, [library]);

  return { status, progress, book, retry };
}
