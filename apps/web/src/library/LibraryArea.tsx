import { Link, useNavigate, useSearch } from "@tanstack/react-router";
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
  writeGroupByPref,
  writeGroupViewPref,
  type GroupView,
} from "../lib/library-prefs";
import { AppHeader } from "../components/AppHeader";
import { QuietSelect } from "../components/QuietSelect";
import { StorageCaption, ViewToggle } from "./LibraryHeader";
import { UploadZone, type UploadZoneHandle } from "./UploadZone";
import { ContinueReading, pickResumeBook } from "./ContinueReading";
import { CoverCard } from "./CoverCard";
import { GroupedGallery } from "./GroupedGallery";
import { OfflineBanner } from "./OfflineBanner";

/**
 * A single **media area** — the shared body behind `/books`, `/music`, and
 * `/videos` (Atrium's per-type IA, brief 25). Each area route renders this with
 * its `kind`; it narrows the shared library list to that kind, then offers the
 * area's own resume strip + gallery (grouping/sort where it makes sense).
 *
 * Replaces the old single unified `/` gallery + in-header type filter — the
 * filter became navigation (the nav tabs in `AppHeader`). Grouping (Shelves ⇄
 * Stacks) stays available for books + music (author/series/subject map onto
 * artist/album for music via `grouping.ts`); videos are a flat sorted grid.
 *
 * The Stacks drill-in target still lives in the URL (`?g`) so Back / refresh /
 * offline behave; navigation stays within the current area's path.
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

interface AreaConfig {
  path: "/books" | "/music" | "/videos";
  heading: string;
  /** Grid tuned to the card aspect for this kind. */
  grid: string;
  /** Grouping only makes sense where items carry author/series/subject-like metadata. */
  grouping: boolean;
  /** Books get the "Browse catalogs" (Gutenberg discover) action. */
  showDiscover: boolean;
  emptyTitle: string;
  emptyBody: string;
  uploadLabel: string;
}

const AREA: Record<MediaKind, AreaConfig> = {
  book: {
    path: "/books",
    heading: "Books",
    grid: "grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5",
    grouping: true,
    showDiscover: true,
    emptyTitle: "No books yet",
    emptyBody: "Add a PDF or EPUB to start your library — it'll show up here as a cover.",
    uploadLabel: "Add a book",
  },
  audio: {
    path: "/music",
    heading: "Music",
    grid: "grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4",
    grouping: true,
    showDiscover: false,
    emptyTitle: "No music yet",
    emptyBody: "Add an MP3 to start listening — artwork and tags come along for the ride.",
    uploadLabel: "Add music",
  },
  video: {
    path: "/videos",
    heading: "Videos",
    grid: "grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3",
    grouping: false,
    showDiscover: false,
    emptyTitle: "No videos yet",
    emptyBody: "Add an MP4 or WebM to start watching.",
    uploadLabel: "Add a video",
  },
};

export function LibraryArea({ kind }: { kind: MediaKind }) {
  // The area themes with the shared reader theme (header toggle drives it).
  useApplyTheme();

  const area = AREA[kind];
  const navigate = useNavigate();
  // The Stacks drill-in target lives in the URL (`?g`); read it loosely since
  // this one component backs three routes that share the schema.
  const search = useSearch({ strict: false }) as { g?: string };
  const focusedGroup = search.g;

  const [sort, setSort] = useState<LibrarySort>("recent");
  const [groupBy, setGroupByState] = useState<LibraryGroup>(area.grouping ? readGroupByPref : "none");
  const [view, setViewState] = useState<GroupView>(readGroupViewPref);

  const { books, isOffline, isLoading, isError, refetch } = useLibraryList(sort);
  const offlineDownload = useOfflineDownload();
  useReconnectProgressSync(books);

  const upload = useUploadBook();
  const remove = useDeleteBook();
  const uploadHandle = useRef<UploadZoneHandle | null>(null);

  // Narrow the shared library list to this area's kind. `kind` is defensively
  // defaulted to "book" for any pre-brief-23 cached row that predates the field.
  const areaBooks = useMemo(
    () => books.filter((b) => (b.kind ?? "book") === kind),
    [books, kind],
  );

  const grouping = area.grouping && groupBy !== "none";
  const hasItems = areaBooks.length > 0;

  const resumeBook = useMemo(() => pickResumeBook(areaBooks), [areaBooks]);

  const clearFocus = useCallback(() => {
    void navigate({ to: area.path, search: (prev) => ({ ...prev, g: undefined }) });
  }, [navigate, area.path]);

  const focusGroup = useCallback(
    (groupKey: string) => {
      void navigate({ to: area.path, search: (prev) => ({ ...prev, g: groupKey }) });
    },
    [navigate, area.path],
  );

  function changeGroupBy(next: LibraryGroup) {
    setGroupByState(next);
    writeGroupByPref(next);
    clearFocus();
  }

  function changeView(next: GroupView) {
    setViewState(next);
    writeGroupViewPref(next);
    if (next === "shelves") clearFocus();
  }

  // Navigate immediately — /read's hydrate hook does the download + progress UI.
  function openBook(book: LibraryBook) {
    void navigate({ to: "/read", search: { format: book.format, book: book.id } });
  }

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
            {area.showDiscover && (
              <Link
                to="/discover"
                className="rounded border border-line-soft/70 px-4 py-2 font-ui text-sm font-medium text-ink-variant transition hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                Browse catalogs
              </Link>
            )}
            {hasItems && (
              <button
                type="button"
                onClick={browse}
                disabled={upload.isPending || isOffline}
                title={isOffline ? "Requires connection" : undefined}
                className="rounded bg-ink-fill px-4 py-2 font-ui text-sm font-semibold text-on-ink-fill transition hover:opacity-90 disabled:bg-paper-container disabled:text-ink-variant"
              >
                {upload.isPending ? "Uploading…" : `+ ${area.uploadLabel}`}
              </button>
            )}
          </>
        }
      />

      {isOffline && <OfflineBanner />}

      {/* Ambient uploader on every area (brief 25): the header "Add" button and
          the whole-window drag target handle uploads, and an empty area shows a
          single area-specific empty state below (with its own Add button) — no
          redundant giant dropzone competing with it. */}
      <UploadZone
        onFile={(file) => upload.mutate(file)}
        busy={upload.isPending}
        disabled={isOffline}
        variant="ambient"
        browseRef={uploadHandle}
      />

      {upload.isError && (
        <p role="alert" className="-mt-4 rounded border border-danger/40 bg-danger-soft/50 px-4 py-2.5 text-sm text-danger">
          Upload failed. Is the API running? Please try again.
        </p>
      )}

      {resumeBook && <ContinueReading book={resumeBook} onOpen={openBook} />}

      <section aria-label={area.heading} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-baseline lg:justify-between lg:gap-4">
          <h2 className="font-display text-3xl font-semibold text-ink">{area.heading}</h2>
          {hasItems && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {area.grouping && grouping && (
                <ViewToggle view={view} onViewChange={changeView} />
              )}
              {area.grouping && (
                <QuietSelect
                  label="Group by"
                  value={groupBy}
                  onChange={changeGroupBy}
                  options={LIBRARY_GROUPS.map((g) => ({ value: g, label: GROUP_LABELS[g] }))}
                />
              )}
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
          <GallerySkeleton grid={area.grid} />
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
        ) : !hasItems ? (
          <EmptyState
            title={area.emptyTitle}
            body={area.emptyBody}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={browse}
                  disabled={isOffline}
                  className="rounded border border-line-soft px-4 py-1.5 font-ui text-sm font-medium text-ink-variant transition hover:text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {area.uploadLabel}
                </button>
                {area.showDiscover && (
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
        ) : grouping ? (
          <GroupedGallery
            books={areaBooks}
            groupBy={groupBy as Exclude<LibraryGroup, "none">}
            view={view}
            focusedGroup={focusedGroup}
            onFocusGroup={focusGroup}
            onClearFocus={clearFocus}
            renderCover={renderCover}
          />
        ) : (
          <div className={area.grid}>{areaBooks.map(renderCover)}</div>
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

function GallerySkeleton({ grid }: { grid: string }) {
  return (
    <div className={grid} aria-hidden>
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
