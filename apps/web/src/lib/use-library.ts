import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LibraryBook, LibrarySort } from "@ebook-reader/shared";

import { deleteBook, fetchLibrary, uploadBook } from "./library-api";

/**
 * React Query hooks for the library (decisions.md D24). The gallery list is a
 * query keyed by sort; upload/delete are mutations that invalidate it so the
 * grid refreshes.
 */

const libraryKey = (sort: LibrarySort) => ["library", sort] as const;

export function useLibrary(sort: LibrarySort) {
  return useQuery({
    queryKey: libraryKey(sort),
    queryFn: () => fetchLibrary(sort),
  });
}

export function useUploadBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadBook(file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["library"] });
    },
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (book: LibraryBook) => deleteBook(book.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["library"] });
    },
  });
}
