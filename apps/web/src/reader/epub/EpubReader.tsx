import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReactReader, ReactReaderStyle, type IReactReaderStyle } from "react-reader";
import type { Book, NavItem, Rendition } from "epubjs";

import { useReaderStore } from "../../store/reader-store";
import {
  HomeButton,
  PageNav,
  ProgressIndicator,
  ReaderToolbar,
  SearchPanel,
  SettingsPopover,
  ToolbarButton,
  TocDrawer,
  type SearchMatch,
  type TocEntry,
  useApplyTheme,
  useAutoHideChrome,
  usePageNavKeys,
} from "../chrome";
import { EpubControls } from "./EpubControls";
import { EpubSettings } from "./EpubSettings";
import { useEpubToc } from "./use-epub-toc";
import { useEpubTheme } from "./use-epub-theme";
import { createEpubSearchProvider } from "./epub-search";
import { resolveSpineHref } from "./resolve-spine-href";

/**
 * EPUB reader (brief 07). Wraps `react-reader` (epub.js) inside the SAME shared
 * Kindle-style chrome the PDF reader uses — it fills the toolbar's
 * `formatControls` seam with EPUB font/theme/search controls, drives the shared
 * `TocDrawer`, `PageNav`, `ProgressIndicator`, auto-hide, and the shared
 * `SearchPanel` — without forking any chrome component.
 *
 * Reflowable (the "Kindle magic"): themes + font settings re-typeset the text
 * via `rendition.themes` (see `use-epub-theme`). Location is an epub.js CFI
 * string, stored in Zustand `currentLocation` (typed `string | number | null`).
 */
export function EpubReader({ file }: { file: File }) {
  const setCurrentLocation = useReaderStore((s) => s.setCurrentLocation);
  const currentLocation = useReaderStore((s) => s.currentLocation);

  // epub.js reads from an ArrayBuffer (in-memory file → no network, no object
  // URL to revoke). react-reader accepts `string | ArrayBuffer` for `url`.
  const [data, setData] = useState<ArrayBuffer | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const bookRef = useRef<Book | null>(null);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);

  // CFI location the ReactReader is controlled by (kept local; mirrored to the
  // store so other chrome can read it). `undefined` until first load so
  // react-reader picks its own start.
  const cfi = typeof currentLocation === "string" ? currentLocation : null;

  // Shared chrome behaviors.
  useApplyTheme();
  const revealChrome = useAutoHideChrome();
  // Theme + font settings applied to the reflowable rendition (real theming).
  useEpubTheme(rendition);

  // The book renders in an iframe whose input events do NOT bubble to the
  // parent window, so the auto-hide chrome would never reveal while the
  // pointer is over the page. epub.js re-emits the iframe's DOM events on the
  // rendition — forward them to the shared reveal.
  useEffect(() => {
    if (!rendition) return;
    const forward = () => revealChrome();
    rendition.on("mousemove", forward);
    rendition.on("click", forward);
    rendition.on("keydown", forward);
    rendition.on("touchstart", forward);
    return () => {
      rendition.off("mousemove", forward);
      rendition.off("click", forward);
      rendition.off("keydown", forward);
      rendition.off("touchstart", forward);
    };
  }, [rendition, revealChrome]);

  // Read the File into an ArrayBuffer once per file.
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setRendition(null);
    setToc([]);
    setPercent(null);
    setCurrentLocation(null);
    (async () => {
      const buf = await file.arrayBuffer();
      if (!cancelled) setData(buf);
    })();
    return () => {
      cancelled = true;
    };
  }, [file, setCurrentLocation]);

  const onLocationChanged = useCallback(
    (loc: string) => {
      setCurrentLocation(loc);
      // Derive a reading percentage from epub.js locations if generated,
      // otherwise from the current spine position.
      const r = rendition;
      if (!r) return;
      try {
        const current = r.currentLocation() as unknown as {
          start?: { percentage?: number };
        };
        const p = current?.start?.percentage;
        if (typeof p === "number" && p >= 0) setPercent(Math.round(p * 100));
      } catch {
        /* percentage best-effort */
      }
    },
    [rendition, setCurrentLocation],
  );

  const onGetRendition = useCallback((r: Rendition) => {
    setRendition(r);
    bookRef.current = r.book;
    // Generate coarse locations in the background so the progress % is stable
    // (1000-char granularity keeps this fast even for large books). Until this
    // resolves, percentages come back 0 — refresh once it's done so the
    // indicator doesn't stay at 0% until the next page turn.
    r.book.ready
      .then(() => r.book.locations.generate(1000))
      .then(() => {
        const current = r.currentLocation() as unknown as {
          start?: { percentage?: number };
        };
        const p = current?.start?.percentage;
        if (typeof p === "number" && p >= 0) setPercent(Math.round(p * 100));
      })
      .catch(() => {
        /* progress falls back to spine percentage */
      });
  }, []);

  const onTocChanged = useCallback((next: NavItem[]) => setToc(next), []);

  const tocEntries = useEpubToc(toc);
  const hasToc = tocEntries.length > 0;

  const onNavigateToc = useCallback(
    (entry: TocEntry) => {
      if (typeof entry.target === "string" && rendition) {
        // Nav-doc hrefs can be relative to the nav document, which epub.js
        // can't resolve against the spine (see resolve-spine-href.ts).
        const resolved = resolveSpineHref(rendition.book, entry.target);
        if (resolved) void rendition.display(resolved);
      }
      setTocOpen(false);
    },
    [rendition],
  );

  const onPrev = useCallback(() => {
    void rendition?.prev();
  }, [rendition]);
  const onNext = useCallback(() => {
    void rendition?.next();
  }, [rendition]);

  usePageNavKeys({ onPrev, onNext });

  // Arrow keys pressed while focus sits inside the book iframe never reach the
  // window listener above — handle the rendition-forwarded keydown too.
  useEffect(() => {
    if (!rendition) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "PageUp") onPrev();
      else if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ")
        onNext();
    };
    rendition.on("keydown", onKey);
    return () => rendition.off("keydown", onKey);
  }, [rendition, onPrev, onNext]);

  // Search provider bound to the loaded book; recreated when the book changes.
  const searchProvider = useMemo(() => {
    if (!rendition) return null;
    return createEpubSearchProvider(rendition.book);
  }, [rendition]);

  // The CFI range of the last search jump, kept so the previous highlight is
  // removed before adding the next one.
  const searchHighlightRef = useRef<string | null>(null);

  const onJumpToMatch = useCallback(
    (match: SearchMatch) => {
      if (typeof match.target === "string" && rendition) {
        const cfi = match.target;
        if (searchHighlightRef.current) {
          try {
            rendition.annotations.remove(searchHighlightRef.current, "highlight");
          } catch {
            /* stale/never-rendered highlight — nothing to remove */
          }
          searchHighlightRef.current = null;
        }
        void rendition.display(cfi).then(() => {
          try {
            rendition.annotations.highlight(cfi, {}, undefined, "search-highlight", {
              fill: "#facc15",
              "fill-opacity": "0.4",
              "mix-blend-mode": "multiply",
            });
            searchHighlightRef.current = cfi;
          } catch {
            /* highlight is best-effort; the jump already landed */
          }
        });
      }
    },
    [rendition],
  );

  // react-reader's own arrows + TOC toggle are hidden — we use the shared
  // chrome for those. Keep the reader area transparent so the themed page
  // background (from the rendition) shows through.
  const readerStyles = useMemo<IReactReaderStyle>(
    () => ({
      ...ReactReaderStyle,
      arrow: { ...ReactReaderStyle.arrow, display: "none" },
      prev: { ...ReactReaderStyle.prev, display: "none" },
      next: { ...ReactReaderStyle.next, display: "none" },
      tocButton: { ...ReactReaderStyle.tocButton, display: "none" },
      tocArea: { ...ReactReaderStyle.tocArea, display: "none" },
      tocBackground: { ...ReactReaderStyle.tocBackground, display: "none" },
      container: { ...ReactReaderStyle.container, background: "transparent" },
      readerArea: {
        ...ReactReaderStyle.readerArea,
        background: "transparent",
        boxShadow: "none",
      },
    }),
    [],
  );

  if (!data) {
    return <LoadingState />;
  }

  return (
    <div className="fixed inset-0 top-0 flex flex-col bg-reader-bg">
      <div className="relative flex-1 overflow-hidden">
        <ReactReader
          url={data}
          // Before we have a CFI, start at spine index 0. Never let react-reader
          // fall back to `toc[0].href` — nav-doc-relative hrefs don't resolve in
          // the spine for books whose nav lives in a subdirectory ("No Section
          // Found" → blank reader).
          location={cfi ?? 0}
          locationChanged={onLocationChanged}
          getRendition={onGetRendition}
          tocChanged={onTocChanged}
          showToc={false}
          swipeable={false}
          readerStyles={readerStyles}
          loadingView={<LoadingState />}
          epubOptions={{ flow: "paginated" }}
        />
      </div>

      <PageNav onPrev={onPrev} onNext={onNext} canPrev canNext />

      <TocDrawer
        open={tocOpen}
        onOpenChange={setTocOpen}
        entries={tocEntries}
        onNavigate={onNavigateToc}
      />

      {searchProvider && (
        <SearchPanel
          open={searchOpen}
          onOpenChange={setSearchOpen}
          provider={searchProvider}
          onJump={onJumpToMatch}
        />
      )}

      <ReaderToolbar
        leftControls={<HomeButton />}
        // The `formatControls` slot IS the format-adaptive seam — EPUB fills it
        // with TOC + search + the font/theme settings trigger (PDF fills it with
        // zoom/invert). Same shell, different slot contents.
        formatControls={
          <EpubControls
            hasToc={hasToc}
            onOpenToc={() => setTocOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
            settingsTrigger={
              <SettingsPopover
                title="Reader settings"
                trigger={
                  <ToolbarButton label="Reader settings">
                    <SettingsIcon />
                  </ToolbarButton>
                }
              >
                <EpubSettings />
              </SettingsPopover>
            }
          />
        }
        rightControls={
          <ProgressIndicator
            current={percent ?? 0}
            total={percent === null ? null : 100}
            variant="percent"
          />
        }
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid h-full place-items-center py-20 text-sm text-reader-fg/60">
      Loading EPUB…
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.2.61.75 1.05 1.42 1.09H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
