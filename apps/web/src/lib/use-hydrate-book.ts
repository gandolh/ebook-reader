import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LibraryBook } from "@ebook-reader/shared";

import { useReaderStore } from "../store/reader-store";
import { fetchBookFile, fetchLibrary } from "./library-api";
import { getLocalProgress, getOfflineBook, offlineRecordToFile, resolveOfflineResume } from "./offline-store";

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
 *
 * Offline-first (brief 20): this seam checks the offline store BEFORE the
 * network. A downloaded book always opens from its stored blob (no request,
 * works with zero connectivity) and resumes from the local progress record when
 * it's newer than the snapshot. Only a book that was never downloaded hits the
 * network — so "fall back to the stored copy on network failure" is subsumed by
 * checking the store first (a stored book never reaches the network path).
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

/**
 * Decode the wire `locator` into a typed `ReaderLocation` for the store: a page
 * number for PDF, the CFI string for EPUB. `null`/unparseable → start fresh.
 */
function resumeLocation(locator: string | null, format: LibraryBook["format"]): number | string | null {
  if (!locator) return null;
  if (format === "pdf") {
    const page = Number(locator);
    return Number.isFinite(page) && page >= 1 ? page : null;
  }
  return locator;
}

export function useHydrateBook(bookId: string | undefined): HydrateState {
  const loadedFile = useReaderStore((s) => s.loadedFile);
  const loadedBookId = useReaderStore((s) => s.loadedBookId);
  const setLoadedBook = useReaderStore((s) => s.setLoadedBook);
  const [status, setStatus] = useState<HydrateStatus>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  // Bumping this re-runs the fetch effect after a failure.
  const [attempt, setAttempt] = useState(0);
  // Snapshot metadata for a book opened offline, when the live list isn't
  // reachable — lets the opening screen still show a title/cover.
  const [offlineBook, setOfflineBook] = useState<LibraryBook | null>(null);

  // Only fetch the library when we actually need to hydrate: a book id in the
  // URL that isn't already the loaded book.
  const needsHydrate = Boolean(bookId) && (!loadedFile || loadedBookId !== bookId);

  const library = useQuery({
    queryKey: ["library", "recent"],
    queryFn: () => fetchLibrary("recent"),
    enabled: needsHydrate,
  });

  // Reset the offline snapshot whenever the target book changes. The route stays
  // mounted across `/read?book=…` param changes, so without this the snapshot set
  // for a previously-opened downloaded book would linger and could represent a
  // DIFFERENT bookId that isn't offline-stored (stale title/cover on the opening
  // screen). Cleared here; re-set by the hydrate effect only for a real store hit.
  useEffect(() => {
    setOfflineBook(null);
  }, [bookId]);

  // Prefer the live row; fall back to the offline snapshot when the list is
  // unreachable (book opened with no connectivity). Guard the snapshot by id so a
  // not-yet-cleared snapshot can never stand in for a different book.
  const book = useMemo(
    () =>
      library.data?.find((b) => b.id === bookId) ??
      (offlineBook && offlineBook.id === bookId ? offlineBook : null),
    [library.data, bookId, offlineBook],
  );

  useEffect(() => {
    if (!needsHydrate || !bookId) {
      setStatus("idle");
      return;
    }

    let cancelled = false;

    // Offline-first: a downloaded book opens from its stored blob with no
    // network, whether or not we're connected. Resume from the local progress
    // record when it's newer than the snapshot (last-write-wins on this device).
    async function openFromOfflineStore(id: string): Promise<boolean> {
      const record = await getOfflineBook(id);
      if (cancelled || !record) return false;
      const local = await getLocalProgress(id);
      if (cancelled) return false;
      setOfflineBook(record.book);
      const wireLocator = resolveOfflineResume(record, local);
      const initialLocation = resumeLocation(wireLocator, record.format);
      setLoadedBook(offlineRecordToFile(record), record.format, record.id, initialLocation);
      setProgress(1);
      setStatus("idle");
      return true;
    }

    setStatus("loading");

    void (async () => {
      try {
        if (await openFromOfflineStore(bookId)) return;
      } catch {
        // Offline store unavailable/errored — fall through to the network path.
      }
      if (cancelled) return;

      // Not downloaded — network path, driven by the react-query library list.
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

      setProgress(found.sizeBytes > 0 ? 0 : null);
      // The saved resume position is an opaque locator on the wire: a page number
      // (string) for PDF, a CFI for EPUB. Type it for the reader's ReaderLocation.
      const initialLocation = resumeLocation(found.locator, found.format);
      try {
        const file = await fetchBookFile(found, (fraction) => {
          if (!cancelled) setProgress(fraction);
        });
        if (!cancelled) setLoadedBook(file, found.format, found.id, initialLocation);
      } catch {
        if (!cancelled) {
          setProgress(null);
          setStatus("error");
        }
      }
    })();

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
