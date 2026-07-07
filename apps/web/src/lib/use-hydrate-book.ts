import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useReaderStore } from "../store/reader-store";
import { fetchBookFile, fetchLibrary } from "./library-api";

/**
 * Re-hydrate the reader from the library on a refresh / direct visit to
 * `/read?book=<id>` (D24). The open `File` lives only in memory, so a reload
 * loses it — but the book id is in the URL, so we can re-fetch the file from
 * the library and reload it into the store. No-op when a file is already
 * loaded (normal in-session navigation) or when there's no `book` id (dev
 * samples).
 */
export type HydrateStatus = "idle" | "loading" | "not-found" | "error";

export function useHydrateBook(bookId: string | undefined): HydrateStatus {
  const loadedFile = useReaderStore((s) => s.loadedFile);
  const loadedBookId = useReaderStore((s) => s.loadedBookId);
  const setLoadedBook = useReaderStore((s) => s.setLoadedBook);
  const [status, setStatus] = useState<HydrateStatus>("idle");

  // Only fetch the library when we actually need to hydrate: a book id in the
  // URL that isn't already the loaded book.
  const needsHydrate = Boolean(bookId) && (!loadedFile || loadedBookId !== bookId);

  const library = useQuery({
    queryKey: ["library", "recent"],
    queryFn: () => fetchLibrary("recent"),
    enabled: needsHydrate,
  });

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
    const book = library.data?.find((b) => b.id === bookId);
    if (!book) {
      setStatus("not-found");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    fetchBookFile(book)
      .then((file) => {
        if (!cancelled) setLoadedBook(file, book.format, book.id);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [needsHydrate, bookId, library.isPending, library.isError, library.data, setLoadedBook]);

  return status;
}
