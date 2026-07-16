import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  LIBRARY_GROUPS,
  LIBRARY_SORTS,
  type LibraryBook,
  type LibraryGroup,
  type LibrarySort,
  type MediaKind,
} from "@ebook-reader/shared";

import { useApplyTheme } from "../reader/chrome/use-apply-theme";
import { useDeleteBook, useLibraryList, useOfflineDownload, useUploadBook } from "../lib/use-library";
import { useReconnectProgressSync } from "../lib/use-progress-sync";
import {
  readGroupByPref,
  readGroupViewPref,
  readTypeFilterPref,
  writeGroupByPref,
  writeGroupViewPref,
  writeTypeFilterPref,
  type GroupView,
  type LibraryTypeFilter,
} from "../lib/library-prefs";
import { AppHeader } from "../components/AppHeader";
import { QuietSelect } from "../components/QuietSelect";
import { StorageCaption, TypeFilterControl, ViewToggle } from "../library/LibraryHeader";
import { UploadZone, type UploadZoneHandle } from "../library/UploadZone";
import { ContinueReading, pickResumeBook } from "../library/ContinueReading";
import { CoverCard } from "../library/CoverCard";
import { GroupedGallery } from "../library/GroupedGallery";
import { OfflineBanner } from "../library/OfflineBanner";

const routeApi = getRouteApi("/");

/**
 * `/` — the **library home** (wiki/reader.md "Library home", D24), hierarchy-
 * first: the shared `AppHeader` (wordmark / Browse catalogs / Add / theme),
 * then a "Continue reading" resume strip for the most recently opened
 * unfinished item, then the cover-card gallery. Styled per wiki/design.md
 * ("Quiet Paper").
 *
 * Uploading: with an EMPTY library the full "Add to Library" dropzone is the
 * hero (first-run job = get a book in). Once the library has content the
 * uploader goes ambient — the header's Ink "Add to library" button opens the
 * picker, and dragging a file anywhere over the window raises a full-screen
 * drop target (see `UploadZone`) — so resuming a read outranks uploading.
 *
 * Opening a card fetches the stored file (`GET /library/:id/file`) into the
 * Zustand handoff seam the readers already consume, then navigates to `/read`.
 *
 * Brief 20 (offline reading) adopts the offline-aware `useLibraryList`:
 * `isOffline` means the grid below is showing cached downloaded-book rows
 * because `GET /library` failed, which drives the banner and disables the
 * online-only actions (upload, remove, starting a new download).
 */

const SORT_LABELS: Record<LibrarySort, string> = {
  recent: "Recent",
  title: "Title",
  author: "Author",
};

const GROUP_LABELS: Record<LibraryGroup, string> = {
  none: "None",
  author: "Author",
  series: "Series",
  subject: "Subject",
};

/** Plural noun for the "no X yet" empty state when a type filter narrows to nothing. */
const TYPE_FILTER_NOUNS: Record<MediaKind, string> = {
  book: "books",
  audio: "music",
  video: "videos",
};

export function Home() {
  // The library themes with the shared reader theme (header toggle drives it).
  useApplyTheme();

  const navigate = useNavigate();
  // The Stacks drill-in target lives in the URL (`?g`), not component state, so
  // Back/refresh/offline all behave (brief 21).
  const { g: focusedGroup } = routeApi.useSearch();

  const [sort, setSort] = useState<LibrarySort>("recent");
  // Group-by + view are durable preferences persisted to localStorage, seeded
  // lazily from it (same mechanism as the reader's paged⇄scroll toggle).
  const [groupBy, setGroupByState] = useState<LibraryGroup>(readGroupByPref);
  const [view, setViewState] = useState<GroupView>(readGroupViewPref);
  // Media-type filter (brief 23c) — same durable-preference mechanism.
  const [typeFilter, setTypeFilterState] = useState<LibraryTypeFilter>(readTypeFilterPref);

  const { books, isOffline, isLoading, isError, refetch } = useLibraryList(sort);
  const offlineDownload = useOfflineDownload();
  useReconnectProgressSync(books);

  const upload = useUploadBook();
  const remove = useDeleteBook();
  const uploadHandle = useRef<UploadZoneHandle | null>(null);

  const grouping = groupBy !== "none";
  const hasBooks = books.length > 0;

  // Applied BEFORE grouping so grouping/shelves/stacks operate on the
  // filtered set (e.g. "Music" narrows to tracks, which then group by
  // artist/album via the existing author/series mapping). `kind` is
  // defensively defaulted to "book" for any pre-brief-23 cached row that
  // predates the field (mirrors grouping.ts's tolerance for older rows).
  const filteredBooks = useMemo(
    () => (typeFilter === "all" ? books : books.filter((b) => (b.kind ?? "book") === typeFilter)),
    [books, typeFilter],
  );

  // The resume strip's subject: most recently opened, unfinished item within
  // the ACTIVE type filter (so the Music tab resumes a track, not a book).
  const resumeBook = useMemo(() => pickResumeBook(filteredBooks), [filteredBooks]);

  // Drop the drill-in `?g` (used when it would no longer make sense: leaving
  // Stacks, or re-grouping into a different set of groups).
  const clearFocus = useCallback(() => {
    void navigate({ to: "/", search: (prev) => ({ ...prev, g: undefined }) });
  }, [navigate]);

  const focusGroup = useCallback(
    (groupKey: string) => {
      void navigate({ to: "/", search: (prev) => ({ ...prev, g: groupKey }) });
    },
    [navigate],
  );

  function changeGroupBy(next: LibraryGroup) {
    setGroupByState(next);
    writeGroupByPref(next);
    // A new grouping invalidates any focused group key.
    clearFocus();
  }

  function changeView(next: GroupView) {
    setViewState(next);
    writeGroupViewPref(next);
    // Shelves has no drill-in; leaving Stacks abandons the focused group.
    if (next === "shelves") clearFocus();
  }

  function changeTypeFilter(next: LibraryTypeFilter) {
    setTypeFilterState(next);
    writeTypeFilterPref(next);
    // Narrowing/widening the filter can add or drop groups entirely, so any
    // focused drill-in key may no longer exist in the new grouped set.
    clearFocus();
  }

  // Navigate immediately — /read's hydrate hook does the download and shows a
  // progress screen (brief 10). Downloading here first left the library frozen
  // with no feedback for the whole transfer.
  function openBook(book: LibraryBook) {
    void navigate({ to: "/read", search: { format: book.format, book: book.id } });
  }

  // Shared cover renderer so grouping never forks CoverCard behavior — the flat
  // gallery, shelves, and the drilled group grid all render the identical card.
  const renderCover = useCallback(
    (book: LibraryBook): ReactNode => (
      <CoverCard
        key={book.id}
        book={book}
        onOpen={openBook}
        onDelete={(b) => remove.mutate(b)}
        deleteDisabled={isOffline}
        offline={
          offlineDownload.isSupported
            ? {
                state: offlineDownload.stateOf(book.id),
                progress: offlineDownload.progressOf(book.id),
                canDownload: !isOffline,
                onDownload: () => offlineDownload.download(book),
                onRemove: () => offlineDownload.remove(book.id),
              }
            : undefined
        }
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOffline, offlineDownload, remove],
  );

  const browse = () => uploadHandle.current?.browse();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-5 py-8 text-ink md:px-16">
      <AppHeader
        caption={
          <StorageCaption
            storage={offlineDownload.storage}
            downloadedCount={offlineDownload.downloaded.length}
          />
        }
        actions={
          <>
            <Link
              to="/discover"
              className="rounded border border-line-soft/70 px-4 py-2 font-ui text-sm font-medium text-ink-variant transition hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              Browse catalogs
            </Link>
            {hasBooks && (
              <button
                type="button"
                onClick={browse}
                disabled={upload.isPending || isOffline}
                title={isOffline ? "Requires connection" : undefined}
                className="rounded bg-ink-fill px-4 py-2 font-ui text-sm font-semibold text-on-ink-fill transition hover:opacity-90 disabled:bg-paper-container disabled:text-ink-variant"
              >
                {upload.isPending ? "Uploading…" : "+ Add to library"}
              </button>
            )}
          </>
        }
      />

      {isOffline && <OfflineBanner />}

      {/* Empty library: the full dropzone IS the hero (first-run job = add a
          book). Established library: the uploader goes ambient — header button
          + whole-window drag target — and the resume strip leads. */}
      <UploadZone
        onFile={(file) => upload.mutate(file)}
        busy={upload.isPending}
        disabled={isOffline}
        variant={hasBooks || isLoading ? "ambient" : "hero"}
        browseRef={uploadHandle}
      />

      {upload.isError && (
        <p role="alert" className="-mt-4 rounded border border-danger/40 bg-danger-soft/50 px-4 py-2.5 text-sm text-danger">
          Upload failed. Is the API running? Please try again.
        </p>
      )}

      {resumeBook && <ContinueReading book={resumeBook} onOpen={openBook} />}

      <section aria-label="Your library" className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-baseline lg:justify-between lg:gap-4">
          <h2 className="font-display text-3xl font-semibold text-ink">Recent Reads</h2>
          {hasBooks && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <TypeFilterControl value={typeFilter} onChange={changeTypeFilter} />
              {grouping && filteredBooks.length > 0 && (
                <ViewToggle view={view} onViewChange={changeView} />
              )}
              <QuietSelect
                label="Group by"
                value={groupBy}
                onChange={changeGroupBy}
                options={LIBRARY_GROUPS.map((g) => ({ value: g, label: GROUP_LABELS[g] }))}
              />
              <QuietSelect
                label="Sort by"
                value={sort}
                onChange={setSort}
                options={LIBRARY_SORTS.map((s) => ({ value: s, label: SORT_LABELS[s] }))}
              />
            </div>
          )}
        </div>

        {isLoading ? (
          <GallerySkeleton />
        ) : isError ? (
          <EmptyState
            title="Couldn't load your library"
            body="The API may be offline. Start it with npm run dev and refresh."
            action={
              <button
                type="button"
                onClick={refetch}
                className="rounded border border-line-soft px-4 py-1.5 text-sm font-medium text-ink-variant transition hover:text-ink"
              >
                Try again
              </button>
            }
          />
        ) : books.length === 0 ? (
          <EmptyState
            title="Your library is empty"
            body="Upload your first book above to get started — it'll show up here as a cover card."
            action={
              <Link
                to="/discover"
                className="rounded border border-line-soft px-4 py-1.5 font-ui text-sm font-medium text-ink-variant transition hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                Browse free classics
              </Link>
            }
          />
        ) : filteredBooks.length === 0 ? (
          <EmptyState
            title={`No ${typeFilter === "all" ? "items" : TYPE_FILTER_NOUNS[typeFilter]} yet`}
            body="Try a different filter above, or add something new."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={browse}
                  disabled={isOffline}
                  className="rounded border border-line-soft px-4 py-1.5 font-ui text-sm font-medium text-ink-variant transition hover:text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {typeFilter === "audio"
                    ? "Upload an MP3"
                    : typeFilter === "video"
                      ? "Upload a video"
                      : "Upload a file"}
                </button>
                {(typeFilter === "book" || typeFilter === "all") && (
                  <Link
                    to="/discover"
                    className="rounded border border-line-soft px-4 py-1.5 font-ui text-sm font-medium text-ink-variant transition hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    Browse free classics
                  </Link>
                )}
              </div>
            }
          />
        ) : groupBy !== "none" ? (
          <GroupedGallery
            books={filteredBooks}
            groupBy={groupBy}
            view={view}
            focusedGroup={focusedGroup}
            onFocusGroup={focusGroup}
            onClearFocus={clearFocus}
            renderCover={renderCover}
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {filteredBooks.map(renderCover)}
          </div>
        )}
      </section>
    </main>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line-soft/50 bg-paper-low/40 px-6 py-16 text-center">
      <p className="font-display text-xl font-semibold text-ink">{title}</p>
      <p className="max-w-md text-ink-variant">{body}</p>
      {action}
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
