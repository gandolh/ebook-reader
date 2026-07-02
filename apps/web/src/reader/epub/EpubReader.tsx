import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ReactReader, ReactReaderStyle, type IReactReaderStyle } from "react-reader";
import { EpubCFI, type Book, type NavItem, type Rendition } from "epubjs";

import { useReaderStore } from "../../store/reader-store";
import {
  ConvertApiError,
  convertEpubToPdf,
  downloadBlob,
  pdfFilenameFor,
} from "../../lib/convert-api";
import {
  HomeButton,
  PageNav,
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
import { ProgressRail, type RailTick } from "./ProgressRail";
import { useEpubToc } from "./use-epub-toc";
import { useEpubTheme } from "./use-epub-theme";
import { createEpubSearchProvider } from "./epub-search";
import { resolveSpineHref } from "./resolve-spine-href";

/**
 * EPUB reader (brief 07 + "quiet paper" redesign). Wraps `react-reader`
 * (epub.js) inside the SAME shared Kindle-style chrome the PDF reader uses.
 *
 * Design intent (PRODUCT.md): the page is the interface. One centered, measure-
 * capped column (`spread: none`); orientation lives at the edges — a running
 * header (book title / chapter) and a scrubbable progress rail that appear and
 * fade WITH the chrome; the text column itself never moves.
 *
 * Reflowable (the "Kindle magic"): themes + font settings re-typeset the text
 * via `rendition.themes` (see `use-epub-theme`). Location is an epub.js CFI
 * string, stored in Zustand `currentLocation`.
 */

/** Compare a relocated `href` with a TOC target, tolerating anchors and
 * nav-doc-relative paths (see resolve-spine-href.ts). */
function hrefMatches(target: unknown, href: string): boolean {
  if (typeof target !== "string") return false;
  const t = target.split("#")[0];
  const h = href.split("#")[0];
  return t === h || h.endsWith(`/${t}`) || t.endsWith(`/${h}`);
}

export function EpubReader({ file }: { file: File }) {
  const setCurrentLocation = useReaderStore((s) => s.setCurrentLocation);
  const currentLocation = useReaderStore((s) => s.currentLocation);
  const chromeVisible = useReaderStore((s) => s.chromeVisible);

  // epub.js reads from an ArrayBuffer (in-memory file → no network, no object
  // URL to revoke). react-reader accepts `string | ArrayBuffer` for `url`.
  const [data, setData] = useState<ArrayBuffer | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const bookRef = useRef<Book | null>(null);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);
  const [bookTitle, setBookTitle] = useState<string | null>(null);
  const [currentTocId, setCurrentTocId] = useState<string | null>(null);
  const [chapterLabel, setChapterLabel] = useState<string | null>(null);
  const [railTicks, setRailTicks] = useState<RailTick[]>([]);
  const [locationsReady, setLocationsReady] = useState(false);
  // Fades the column out during TOC/search/rail jumps (a leap shouldn't look
  // like a glitch); sequential page turns stay instant — reading is sacred.
  const [jumping, setJumping] = useState(false);

  // CFI location the ReactReader is controlled by (kept local; mirrored to the
  // store so other chrome can read it).
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
    setBookTitle(null);
    setCurrentTocId(null);
    setChapterLabel(null);
    setRailTicks([]);
    setLocationsReady(false);
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
    // Book title for the running header (best-effort).
    r.book.loaded.metadata
      .then((m) => setBookTitle(m?.title?.trim() || null))
      .catch(() => {
        /* header falls back to nothing */
      });
    // Generate coarse locations in the background so the progress % is stable
    // (1000-char granularity keeps this fast even for large books). Until this
    // resolves, percentages come back 0 — refresh once it's done so the
    // indicator doesn't stay at 0% until the next page turn.
    r.book.ready
      .then(() => r.book.locations.generate(1000))
      .then(() => {
        setLocationsReady(true);
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

  // Track the current chapter (running header + TOC highlight + footer button):
  // every relocation maps the landed spine href back to its TOC entry.
  useEffect(() => {
    if (!rendition || tocEntries.length === 0) return;
    const onRelocated = (loc: { start?: { href?: string } }) => {
      const href = loc?.start?.href;
      if (!href) return;
      const found = tocEntries.find((e) => hrefMatches(e.target, href)) ?? null;
      setCurrentTocId(found?.id ?? null);
      setChapterLabel(found?.label ?? null);
    };
    rendition.on("relocated", onRelocated);
    return () => rendition.off("relocated", onRelocated);
  }, [rendition, tocEntries]);

  // Chapter tick positions for the progress rail, in locations-space so they
  // line up exactly with the accent fill. Best-effort: any failure just means
  // a tickless rail.
  useEffect(() => {
    if (!rendition || !locationsReady || tocEntries.length === 0) return;
    const book = rendition.book;
    try {
      const locations = book.locations as unknown as {
        length(): number;
        cfiFromLocation(loc: number): string;
      };
      const total = locations.length();
      if (!total) return;

      // First location index per spine position (single ordered pass).
      const firstLocBySpine = new Map<number, number>();
      for (let i = 0; i < total; i++) {
        const parsed = new EpubCFI(locations.cfiFromLocation(i)) as unknown as {
          spinePos: number;
        };
        if (!firstLocBySpine.has(parsed.spinePos)) {
          firstLocBySpine.set(parsed.spinePos, i);
        }
      }

      const spine = book.spine as unknown as {
        get(target: string): { index?: number } | null;
      };
      const seen = new Set<number>();
      const ticks: RailTick[] = [];
      for (const entry of tocEntries) {
        if (entry.depth !== 0 || typeof entry.target !== "string") continue;
        const resolved = resolveSpineHref(book, entry.target);
        if (!resolved) continue;
        const index = spine.get(resolved)?.index;
        if (index == null || seen.has(index)) continue;
        seen.add(index);
        const loc = firstLocBySpine.get(index);
        if (loc == null) continue;
        ticks.push({ pct: (loc / total) * 100, label: entry.label });
      }
      setRailTicks(ticks);
    } catch {
      setRailTicks([]);
    }
  }, [rendition, locationsReady, tocEntries]);

  // Display a target with a 150ms crossfade (TOC/search/rail leaps only).
  const jumpTo = useCallback(
    (target: string, after?: () => void) => {
      if (!rendition) return;
      setJumping(true);
      void rendition
        .display(target)
        .then(() => after?.())
        .catch(() => {
          /* jump is best-effort */
        })
        .finally(() => {
          requestAnimationFrame(() => setJumping(false));
        });
    },
    [rendition],
  );

  const onNavigateToc = useCallback(
    (entry: TocEntry) => {
      if (typeof entry.target === "string" && rendition) {
        // Nav-doc hrefs can be relative to the nav document, which epub.js
        // can't resolve against the spine (see resolve-spine-href.ts).
        const resolved = resolveSpineHref(rendition.book, entry.target);
        if (resolved) jumpTo(resolved);
      }
      setTocOpen(false);
    },
    [rendition, jumpTo],
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
        const cfiTarget = match.target;
        if (searchHighlightRef.current) {
          try {
            rendition.annotations.remove(searchHighlightRef.current, "highlight");
          } catch {
            /* stale/never-rendered highlight — nothing to remove */
          }
          searchHighlightRef.current = null;
        }
        jumpTo(cfiTarget, () => {
          try {
            rendition.annotations.highlight(cfiTarget, {}, undefined, "search-highlight", {
              fill: "#facc15",
              "fill-opacity": "0.4",
              "mix-blend-mode": "multiply",
            });
            searchHighlightRef.current = cfiTarget;
          } catch {
            /* highlight is best-effort; the jump already landed */
          }
        });
      }
    },
    [rendition, jumpTo],
  );

  const onSeek = useCallback(
    (pct: number) => {
      const book = bookRef.current;
      if (!book || !rendition) return;
      try {
        const locations = book.locations as unknown as {
          cfiFromPercentage(p: number): string;
        };
        const target = locations.cfiFromPercentage(pct / 100);
        if (target) jumpTo(target);
      } catch {
        /* seek is best-effort */
      }
    },
    [rendition, jumpTo],
  );

  const openTocFromFooter = useCallback(() => setTocOpen(true), []);

  // Secondary action: export this EPUB as a PDF (server round-trip through
  // Calibre). The main flow is reading — this is one toolbar button, never a
  // screen of its own (D1: conversion is an export utility).
  const [convertError, setConvertError] = useState<string | null>(null);
  const convertMutation = useMutation({
    mutationFn: (f: File) => convertEpubToPdf(f),
  });
  const converting = convertMutation.isPending;
  const onDownloadPdf = useCallback(() => {
    if (converting) return;
    setConvertError(null);
    convertMutation.mutate(file, {
      onSuccess: (blob) => downloadBlob(blob, pdfFilenameFor(file.name)),
      onError: (err) =>
        setConvertError(
          err instanceof ConvertApiError ? err.message : "Conversion failed.",
        ),
    });
  }, [file, converting, convertMutation]);

  // Error notice is transient — dismiss on its own after a beat.
  useEffect(() => {
    if (!convertError) return;
    const id = setTimeout(() => setConvertError(null), 6000);
    return () => clearTimeout(id);
  }, [convertError]);

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
    return <SkeletonPage />;
  }

  return (
    <div className="fixed inset-0 top-0 flex flex-col bg-reader-bg">
      {/* Running header — orientation at the edge, fades with the chrome. The
          column below reserves this space (pt), so text is never covered. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 z-20 flex items-baseline justify-between gap-6 px-6 py-2.5 text-xs text-reader-fg/50 transition-opacity duration-300 ${
          chromeVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="min-w-0 truncate">{bookTitle ?? ""}</span>
        <span className="min-w-0 truncate text-right">{chapterLabel ?? ""}</span>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {/* One centered, measure-capped column — the page is the interface.
            `relative` is load-bearing: react-reader positions its reader area
            absolutely, and it must anchor to THIS capped box, not the
            full-width container. */}
        <div className="relative mx-auto h-full w-full max-w-2xl pb-5 pt-9">
          <ReactReader
            url={data}
            // Before we have a CFI, start at spine index 0. Never let
            // react-reader fall back to `toc[0].href` — nav-doc-relative hrefs
            // don't resolve in the spine for books whose nav lives in a
            // subdirectory ("No Section Found" → blank reader).
            location={cfi ?? 0}
            locationChanged={onLocationChanged}
            getRendition={onGetRendition}
            tocChanged={onTocChanged}
            showToc={false}
            swipeable={false}
            readerStyles={readerStyles}
            loadingView={<SkeletonPage />}
            epubOptions={{ flow: "paginated", spread: "none" }}
          />
          {/* Jump crossfade veil. Deliberately an overlay rather than opacity
              on the column itself: animating opacity on an ancestor of the
              epub iframe promotes it to a compositor layer that can cache
              stale pixels (theme changes stop repainting). */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 bg-reader-bg transition-opacity duration-150 motion-reduce:transition-none ${
              jumping ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>
      </div>

      <PageNav onPrev={onPrev} onNext={onNext} canPrev canNext />

      <ProgressRail
        percent={percent ?? 0}
        ticks={railTicks}
        visible={chromeVisible}
        onSeek={onSeek}
      />

      <TocDrawer
        open={tocOpen}
        onOpenChange={setTocOpen}
        entries={tocEntries}
        onNavigate={onNavigateToc}
        currentId={currentTocId}
      />

      {searchProvider && (
        <SearchPanel
          open={searchOpen}
          onOpenChange={setSearchOpen}
          provider={searchProvider}
          onJump={onJumpToMatch}
        />
      )}

      {convertError && (
        <div
          role="alert"
          className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-800 shadow-md"
        >
          {convertError}
        </div>
      )}

      <ReaderToolbar
        leftControls={
          <>
            <HomeButton />
            <ToolbarButton
              label={converting ? "Converting to PDF…" : "Download as PDF"}
              onClick={onDownloadPdf}
              disabled={converting}
            >
              {converting ? <SpinnerIcon /> : <DownloadIcon />}
            </ToolbarButton>
          </>
        }
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
                    <span className="text-sm font-semibold leading-none tracking-tight">
                      Aa
                    </span>
                  </ToolbarButton>
                }
              >
                <EpubSettings />
              </SettingsPopover>
            }
          />
        }
        rightControls={
          <button
            type="button"
            onClick={openTocFromFooter}
            title="Open table of contents"
            aria-label="Open table of contents"
            className="flex max-w-56 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-reader-fg/80 transition hover:bg-reader-bg"
          >
            {chapterLabel && (
              <span className="min-w-0 truncate text-xs text-reader-fg/70">
                {chapterLabel}
              </span>
            )}
            <span className="shrink-0 rounded bg-reader-surface px-1.5 py-0.5 text-xs tabular-nums text-reader-fg/70">
              {percent ?? 0}%
            </span>
          </button>
        }
      />
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M4.5 19.5h15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="motion-safe:animate-spin"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" opacity="0.25" />
      <path
        d="M21 12a9 9 0 00-9-9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Loading = a page taking shape: faint prose-line bars in the same measure-
 * capped column the text will land in (no spinner, no "Loading…" string). */
function SkeletonPage() {
  const widths = ["w-2/5", "w-full", "w-full", "w-11/12", "w-full", "w-4/5", "", "w-full", "w-full", "w-10/12", "w-full", "w-3/5"];
  return (
    <div
      role="status"
      aria-label="Loading book"
      className="mx-auto flex h-full w-full max-w-2xl flex-col gap-3.5 px-10 pt-20"
    >
      {widths.map((w, i) =>
        w === "" ? (
          <div key={i} className="h-3" />
        ) : (
          <div
            key={i}
            className={`h-3.5 rounded-sm bg-reader-fg/10 motion-safe:animate-pulse ${w}`}
          />
        ),
      )}
    </div>
  );
}
