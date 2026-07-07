import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LIBRARY_SORTS, type LibraryBook, type LibrarySort } from "@ebook-reader/shared";

import { useApplyTheme } from "../reader/chrome/use-apply-theme";
import { useDeleteBook, useLibrary, useUploadBook } from "../lib/use-library";
import { LibraryHeader } from "../library/LibraryHeader";
import { UploadZone } from "../library/UploadZone";
import { CoverCard } from "../library/CoverCard";

/**
 * `/` — the **library home** (wiki/reader.md "Library home", D24). Header +
 * "Add to Library" dropzone + a cover-card gallery of saved books. Styled per
 * wiki/design.md ("Quiet Paper"). Replaces the old one-step uploader; the
 * dropzone UX survives inside it.
 *
 * Opening a card fetches the stored file (`GET /library/:id/file`) into the
 * Zustand handoff seam the readers already consume, then navigates to `/read`.
 */

const SORT_LABELS: Record<LibrarySort, string> = {
  recent: "Recent",
  title: "Title",
  author: "Author",
};

export function Home() {
  // The library themes with the shared reader theme (header toggle drives it).
  useApplyTheme();

  const navigate = useNavigate();

  const [sort, setSort] = useState<LibrarySort>("recent");

  const library = useLibrary(sort);
  const upload = useUploadBook();
  const remove = useDeleteBook();

  // Navigate immediately — /read's hydrate hook does the download and shows a
  // progress screen (brief 10). Downloading here first left the library frozen
  // with no feedback for the whole transfer.
  function openBook(book: LibraryBook) {
    void navigate({ to: "/read", search: { format: book.format, book: book.id } });
  }

  const books = library.data ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-5 py-8 text-ink md:px-16">
      <LibraryHeader />

      <UploadZone onFile={(file) => upload.mutate(file)} busy={upload.isPending} />

      {upload.isError && (
        <p role="alert" className="-mt-6 rounded border border-danger/40 bg-danger-soft/50 px-4 py-2.5 text-sm text-danger">
          Upload failed. Is the API running? Please try again.
        </p>
      )}

      <section aria-label="Your library" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <h2 className="font-display text-3xl font-semibold text-ink">Recent Reads</h2>
          {books.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-ink-variant">
              Sort by:
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as LibrarySort)}
                className="rounded border border-line-soft bg-paper-raised px-2 py-1 font-ui text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                {LIBRARY_SORTS.map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {library.isLoading ? (
          <GallerySkeleton />
        ) : library.isError ? (
          <EmptyState
            title="Couldn't load your library"
            body="The API may be offline. Start it with npm run dev and refresh."
          />
        ) : books.length === 0 ? (
          <EmptyState
            title="Your library is empty"
            body="Upload your first book above to get started — it'll show up here as a cover card."
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {books.map((book) => (
              <CoverCard key={book.id} book={book} onOpen={openBook} onDelete={(b) => remove.mutate(b)} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-line-soft/50 bg-paper-low/40 px-6 py-16 text-center">
      <p className="font-display text-xl font-semibold text-ink">{title}</p>
      <p className="max-w-md text-ink-variant">{body}</p>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="aspect-[2/3] w-full animate-pulse rounded-(--radius-cover) bg-paper-container" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-paper-container" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-paper-container" />
        </div>
      ))}
    </div>
  );
}
