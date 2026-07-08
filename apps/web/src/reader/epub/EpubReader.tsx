import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReactReader, ReactReaderStyle, type IReactReaderStyle } from "react-reader";
import { EpubCFI, type Book, type NavItem, type Rendition } from "epubjs";

import { useReaderStore } from "../../store/reader-store";
// EPUB→PDF conversion is hidden for now (see the toolbar). Restore alongside
// the "Download as PDF" button:
// import { useMutation } from "@tanstack/react-query";
// import {
//   ConvertApiError,
//   convertEpubToPdf,
//   downloadBlob,
//   pdfFilenameFor,
// } from "../../lib/convert-api";
import {
  HomeButton,
  PageNav,
  PageJumpInput,
  ProgressRail,
  ReaderToolbar,
  SearchPanel,
  SettingsPopover,
  ToolbarButton,
  TocSidebar,
  type RailTick,
  type SearchMatch,
  type TocEntry,
  useApplyTheme,
  useAutoHideChrome,
  usePageNavKeys,
} from "../chrome";
import { EpubControls } from "./EpubControls";
import { EpubSettings, fontStackFor } from "./EpubSettings";
import { useEpubToc } from "./use-epub-toc";
import { useEpubTheme, themeRules } from "./use-epub-theme";
import { createEpubSearchProvider } from "./epub-search";
import { resolveSpineHref } from "./resolve-spine-href";
import {
  buildPageMapDetached,
  settledStageSize,
  bookPageFromLocation,
  type EpubPageMap,
  type LocationLike,
} from "./epub-page-map";

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
  const tocSidebarOpen = useReaderStore((s) => s.tocSidebarOpen);
  const toggleTocSidebar = useReaderStore((s) => s.toggleTocSidebar);
  // Layout-affecting settings — a change invalidates the page map.
  const fontSettings = useReaderStore((s) => s.fontSettings);

  // epub.js reads from an ArrayBuffer (in-memory file → no network, no object
  // URL to revoke). react-reader accepts `string | ArrayBuffer` for `url`.
  const [data, setData] = useState<ArrayBuffer | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const bookRef = useRef<Book | null>(null);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);
  // Book-wide "Page N / total" — accurate rendered pages (research option 3).
  // We pre-paginate every spine item on THIS rendition (behind the loading
  // veil) and build a prefix sum of per-chapter page counts (`pageMap`); the
  // live page is `offset[section] + displayed.page`, which ticks by exactly 1
  // per screen turn and never resets at chapter boundaries. Recomputed when the
  // layout changes (font size/family/spacing/margins, viewport). Distinct from
  // the char-based `locations` below, which still drive the % rail + seeking.
  const [pageMap, setPageMap] = useState<EpubPageMap | null>(null);
  // Mirror of `pageMap` for event handlers, so the single `relocated` handler
  // always reads the LATEST map (a recompute swaps it) without re-subscribing
  // or capturing a stale map in a closure — a stale map was one cause of the
  // page number jumping around.
  const pageMapRef = useRef<EpubPageMap | null>(null);
  const [bookPage, setBookPage] = useState<number | null>(null);
  // "computing" = the background page-map walk is in flight (initial or a
  // layout-change recompute). It no longer gates the reader — the book stays
  // visible and interactive throughout; only the "Page N/M" badge waits on it.
  const [pageMapStatus, setPageMapStatus] =
    useState<"idle" | "computing" | "ready" | "failed">("idle");
  // Bumped to force a page-map recompute (layout-affecting settings changed).
  const [recomputeToken, setRecomputeToken] = useState(0);
  // Skip the debounced recompute on the very first settings render.
  const settingsSettledRef = useRef(false);
  const [bookTitle, setBookTitle] = useState<string | null>(null);
  const [currentTocId, setCurrentTocId] = useState<string | null>(null);
  const [chapterLabel, setChapterLabel] = useState<string | null>(null);
  const [railTicks, setRailTicks] = useState<RailTick[]>([]);
  const [locationsReady, setLocationsReady] = useState(false);
  // True while the "go to page" jump is stepping the rendition through pages, so
  // the interim relocations it fires are ignored (not echoed into react-reader's
  // controlled location, which would fight the walk). Reset when the walk ends.
  const jumpSteppingRef = useRef(false);
  // Fades the column out during TOC/search/rail jumps (a leap shouldn't look
  // like a glitch); sequential page turns stay instant — reading is sacred.
  const [jumping, setJumping] = useState(false);

  // CFI location the ReactReader is controlled by (kept local; mirrored to the
  // store so other chrome can read it).
  const cfi = typeof currentLocation === "string" ? currentLocation : null;

  // Shared chrome behaviors.
  useApplyTheme();
  useAutoHideChrome(); // now only guarantees the bars are visible on mount
  // Theme + font settings applied to the reflowable rendition (real theming).
  // Declared BEFORE the precompute effect so its effect runs first — the page
  // walk must measure with the active font, not the default.
  useEpubTheme(rendition);

  // ── Build the book-wide page map in the BACKGROUND ────────────────────────
  // "Page N / M" needs an accurate per-chapter page count, which epub.js only
  // knows AFTER laying each chapter out. Rather than block the open behind a
  // veil (the old flow walked the VISIBLE rendition through every chapter), we
  // parse a second, throwaway Book from the same bytes and walk it OFF-SCREEN
  // at the exact stage size + font settings of the visible reader. The reader
  // shows the resume page immediately; the badge fills in when the count lands.
  // Re-runs on `recomputeToken` (layout-affecting settings / viewport changed).
  useEffect(() => {
    if (!rendition || !data) return;
    let cancelled = false;
    setPageMapStatus("computing");

    // Snapshot the live theme/font so the off-screen walk lays out identically
    // to the visible reader — a width/font mismatch would make the counted
    // total disagree with the on-screen pages (epub.js #274).
    const { theme, fontSettings } = useReaderStore.getState();
    const applyStyles = (r: Rendition) => {
      const name = `reader-${theme}`;
      r.themes.register(name, themeRules(theme, fontSettings.lineSpacing, fontSettings.margins));
      r.themes.select(name);
      r.themes.fontSize(`${fontSettings.size}px`);
      r.themes.font(fontStackFor(fontSettings.family));
    };

    void (async () => {
      // Wait for the visible column to settle before measuring against it.
      const size = await settledStageSize(rendition);
      if (cancelled) return;
      // Read a FRESH ArrayBuffer from the File for the off-screen build — never
      // reuse react-reader's `data` buffer: epub.js can detach it while we wait
      // above, which would make the detached parse fail (blank "Page …" badge).
      let bytes: ArrayBuffer;
      try {
        bytes = await file.arrayBuffer();
      } catch {
        if (!cancelled) setPageMapStatus("failed");
        return;
      }
      if (cancelled) return;
      try {
        const map = await buildPageMapDetached(bytes, size, applyStyles);
        if (cancelled) return;
        pageMapRef.current = map;
        setPageMap(map);
        setPageMapStatus("ready");
        // Seed the badge from the reader's current (unmoved) position.
        const loc = rendition.currentLocation() as unknown as LocationLike;
        setBookPage(bookPageFromLocation(loc, map));
        refreshProgress(rendition);
      } catch {
        if (!cancelled) setPageMapStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendition, data, recomputeToken]);

  // Recompute the page map when a layout-affecting setting settles (font size /
  // family / line-spacing / margins). Debounced so dragging a slider doesn't
  // re-walk on every tick. Skips the first render (that's the initial compute).
  useEffect(() => {
    if (!settingsSettledRef.current) {
      settingsSettledRef.current = true;
      return;
    }
    const id = setTimeout(() => setRecomputeToken((t) => t + 1), 500);
    return () => clearTimeout(id);
  }, [
    fontSettings.size,
    fontSettings.family,
    fontSettings.lineSpacing,
    fontSettings.margins,
  ]);

  // Recompute on viewport resize too (page counts are width-dependent).
  useEffect(() => {
    if (pageMapStatus === "idle") return;
    let id: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(id);
      id = setTimeout(() => setRecomputeToken((t) => t + 1), 600);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", onResize);
    };
  }, [pageMapStatus]);


  // Read the File into an ArrayBuffer once per file.
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setRendition(null);
    setToc([]);
    setPercent(null);
    setPageMap(null);
    pageMapRef.current = null;
    setBookPage(null);
    setPageMapStatus("idle");
    setRecomputeToken(0);
    settingsSettledRef.current = false;
    setBookTitle(null);
    setCurrentTocId(null);
    setChapterLabel(null);
    setRailTicks([]);
    setLocationsReady(false);
    jumpSteppingRef.current = false;
    // Resume at the user's saved CFI (per-user, from the library) if there is
    // one, else start at the beginning. react-reader's controlled `location`
    // prop displays it immediately; the background page-map build (off-screen,
    // on a throwaway Book) never disturbs this position.
    const saved = useReaderStore.getState().initialLocation;
    setCurrentLocation(typeof saved === "string" ? saved : null);
    (async () => {
      const buf = await file.arrayBuffer();
      if (!cancelled) setData(buf);
    })();
    return () => {
      cancelled = true;
    };
  }, [file, setCurrentLocation]);

  // Overall percentage (drives the % rail + the library progress sync). Comes
  // from epub.js's char-based `locations` — reflowable, layout-independent, so
  // the rail stays stable across font changes. The book-wide PAGE number is
  // handled separately by the page map (which IS layout-dependent).
  const refreshProgress = useCallback((r: Rendition) => {
    try {
      const current = r.currentLocation() as unknown as {
        start?: { percentage?: number };
      };
      const p = current?.start?.percentage;
      if (typeof p === "number" && p >= 0) {
        setPercent(Math.round(p * 100));
        // Report coarse progress for the library sync hook (D24).
        useReaderStore.getState().setProgressFraction(Math.min(Math.max(p, 0), 1));
      }
    } catch {
      /* progress readout is best-effort */
    }
  }, []);

  const onLocationChanged = useCallback(
    (loc: string) => {
      // Ignore relocations emitted while the page-jump walk is stepping — they
      // aren't the reader's settled position and would fight the walk. The final
      // position is written to the store when the walk ends.
      if (jumpSteppingRef.current) return;
      setCurrentLocation(loc);
      // The book PAGE number is updated by the single `relocated` handler
      // (below) from the authoritative event payload — not here, where we'd
      // have to re-read a possibly-stale currentLocation().
    },
    [setCurrentLocation],
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
    // Generate coarse char-based locations in the background — these drive the
    // % rail + seeking + chapter ticks (layout-independent). The book-wide PAGE
    // count is built separately by the precompute walk below.
    r.book.ready
      .then(() => r.book.locations.generate(1000))
      .then(() => {
        setLocationsReady(true);
        refreshProgress(r);
      })
      .catch(() => {
        /* rail falls back to spine percentage */
      });
  }, [refreshProgress]);

  // Belt-and-braces for the badge: whichever finishes last — locations
  // generation or the first render — a `relocated` event re-reads progress, so
  // the page counter can't get stuck on its pre-locations fallback.
  useEffect(() => {
    if (!rendition) return;
    const onRelocated = (loc: LocationLike) => {
      refreshProgress(rendition);
      const map = pageMapRef.current;
      if (map) setBookPage(bookPageFromLocation(loc, map));
    };
    rendition.on("relocated", onRelocated);
    return () => rendition.off("relocated", onRelocated);
  }, [rendition, refreshProgress]);

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
      // The docked sidebar stays open after a jump (unlike the old overlay
      // drawer) — navigating within contents shouldn't dismiss it.
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

  // Jump to a book-wide page number from the footer input. A reflowable book has
  // no CFI per page — char-location interpolation lands many pages off — so the
  // only way to hit the EXACT page is to paginate: display the target's spine
  // section (page 1 of it), then step forward to the page within it. The page
  // map counts pages the same way the live reader does, so `offset + stepped`
  // equals the target exactly.
  //
  // The catch is that each `rendition.next()` emits a relocation, which react-
  // reader would echo into its controlled `location` prop and re-display mid-
  // walk, corrupting the position. `jumpSteppingRef` suppresses those interim
  // relocations; we sync the store once to the settled spot at the end.
  const jumpToBookPage = useCallback(
    (page: number) => {
      const map = pageMapRef.current;
      const book = bookRef.current;
      if (!map || !book || !rendition || jumpSteppingRef.current) return;
      const target = Math.min(Math.max(page, 1), map.total);

      // Spine index whose page range covers the target (offsets are prefix sums).
      let idx = 0;
      for (let i = 0; i < map.offsets.length; i++) {
        const start = map.offsets[i];
        const count = map.counts[i] ?? 0;
        if (count > 0 && target > start && target <= start + count) {
          idx = i;
          break;
        }
      }
      const pageInChapter = target - (map.offsets[idx] ?? 0); // 1-based

      const spine = book.spine as unknown as {
        get(target: number): { href?: string } | null;
      };
      const href = spine.get(idx)?.href;
      if (!href) return;

      setJumping(true);
      jumpSteppingRef.current = true;
      void (async () => {
        try {
          await rendition.display(href); // page 1 of the section
          for (let k = 1; k < pageInChapter; k++) {
            await rendition.next();
          }
        } catch {
          /* jump is best-effort */
        } finally {
          jumpSteppingRef.current = false;
          // Sync the store + badge once to where we actually settled.
          try {
            const settled = rendition.currentLocation() as unknown as LocationLike & {
              start?: { cfi?: string };
            };
            const cfi = settled?.start?.cfi;
            if (cfi) setCurrentLocation(cfi);
            const m = pageMapRef.current;
            if (m) setBookPage(bookPageFromLocation(settled, m));
            refreshProgress(rendition);
          } catch {
            /* settle read is best-effort */
          }
          requestAnimationFrame(() => setJumping(false));
        }
      })();
    },
    [rendition, setCurrentLocation, refreshProgress],
  );

  // Secondary action: export this EPUB as a PDF (server round-trip through
  // Calibre). Hidden for now — reading is the whole product (see the toolbar
  // below). The conversion machinery is kept, commented out, so restoring the
  // "Download as PDF" button is a single revert:
  //
  // const [convertError, setConvertError] = useState<string | null>(null);
  // const convertMutation = useMutation({
  //   mutationFn: (f: File) => convertEpubToPdf(f),
  // });
  // const converting = convertMutation.isPending;
  // const onDownloadPdf = useCallback(() => {
  //   if (converting) return;
  //   setConvertError(null);
  //   convertMutation.mutate(file, {
  //     onSuccess: (blob) => downloadBlob(blob, pdfFilenameFor(file.name)),
  //     onError: (err) =>
  //       setConvertError(
  //         err instanceof ConvertApiError ? err.message : "Conversion failed.",
  //       ),
  //   });
  // }, [file, converting, convertMutation]);
  //
  // // Error notice is transient — dismiss on its own after a beat.
  // useEffect(() => {
  //   if (!convertError) return;
  //   const id = setTimeout(() => setConvertError(null), 6000);
  //   return () => clearTimeout(id);
  // }, [convertError]);

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
        // The default `transition: all .3s ease` exists for react-reader's
        // built-in TOC slide (hidden here) — without the TOC it only adds
        // laggy easing to resizes.
        transition: "none",
      },
      // react-reader insets the epub view by top:50/left:50/right:50/bottom:20
      // to make room for ITS arrows + title — all of which we hide. Zero the
      // inset so the page fills the column; the readable margin then comes from
      // the column's padding (vertical) + the epub body's own margin (`Aa`
      // setting, horizontal).
      reader: { ...ReactReaderStyle.reader, top: 0, left: 0, right: 0, bottom: 0 },
    }),
    [],
  );

  if (!data) {
    return <SkeletonPage />;
  }

  return (
    // Row layout: the docked contents sidebar sits in-flow on the left and the
    // reading pane fills the rest, so opening the sidebar shifts (not covers)
    // the text. The pane is the positioning context for the chrome overlays
    // (header/nav/rail/toolbar are `absolute` within it), which keeps them
    // clear of the sidebar without any transform on the epub iframe's ancestor.
    <div className="fixed inset-0 top-0 flex bg-reader-bg">
      <TocSidebar
        open={tocSidebarOpen}
        entries={tocEntries}
        onNavigate={onNavigateToc}
        onClose={toggleTocSidebar}
        currentId={currentTocId}
      />

      {/* Reading pane as a 3-row grid: top bar / content / bottom bar. The bars
          are in-flow rows, so paginated content can never render under them
          (no more overlay + padding hack), and the content row (1fr) simply
          takes the space between. */}
      <div className="relative grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr_auto] overflow-hidden">
        {/* Row 1: top bar — running orientation (title / chapter). In-flow now;
            fades with the chrome but keeps its row so content stays put. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none flex items-baseline justify-between gap-6 px-6 py-2.5 text-xs text-reader-fg/50 transition-opacity duration-300 ${
            chromeVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="min-w-0 truncate">{bookTitle ?? ""}</span>
          <span className="min-w-0 truncate text-right">{chapterLabel ?? ""}</span>
        </div>

        {/* Row 2: content. min-h-0 + min-w-0 let the 1fr row shrink in BOTH
            axes, so the very wide epub iframe (all pages laid out as columns)
            can't blow the grid column out past the viewport — it's clipped
            here instead of widening the pane and the bars. */}
        <div className="relative min-h-0 min-w-0 overflow-hidden">
        {/* One centered, measure-capped column — the page is the interface.
            `relative` is load-bearing: react-reader positions its reader area
            absolutely, and it must anchor to THIS capped box, not the
            full-width container. A wide cap + minimal padding lets the page
            fill the space (epub's own margins still keep the text readable). */}
        <div className="relative mx-auto h-full w-full max-w-4xl px-2 py-5">
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
            // Passing ANY handleKeyPress disables react-reader's built-in
            // arrow-key paging (a document-level keyup listener). Without
            // this, one arrow press turns the page TWICE — once via our
            // keydown handlers, once via theirs — a visible double-flip.
            handleKeyPress={() => {}}
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
          {/* Page-turn tap zones — scoped to the content row so they cover only
              the reading area, not the bars. */}
          <PageNav onPrev={onPrev} onNext={onNext} canPrev canNext />
        </div>

        <ProgressRail
          percent={percent ?? 0}
          totalPages={pageMap?.total ?? null}
          ticks={railTicks}
          visible={chromeVisible}
          onSeek={onSeek}
        />

        {searchProvider && (
          <SearchPanel
            open={searchOpen}
            onOpenChange={setSearchOpen}
            provider={searchProvider}
            onJump={onJumpToMatch}
          />
        )}

        {/* Conversion error banner — hidden along with the "Download as PDF"
            button (restore together):
        {convertError && (
          <div
            role="alert"
            className="absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-800 shadow-md"
          >
            {convertError}
          </div>
        )} */}

        <ReaderToolbar
          // The "Download as PDF" export is hidden for now — reading is the
          // whole product. The conversion code (convertMutation, onDownloadPdf,
          // DownloadIcon) is kept so the button can be restored in one edit.
          leftControls={<HomeButton />}
          // The `formatControls` slot IS the format-adaptive seam — EPUB fills it
          // with TOC + search + the font/theme settings trigger (PDF fills it with
          // zoom/invert). Same shell, different slot contents.
          formatControls={
            <EpubControls
              hasToc={hasToc}
              onOpenToc={toggleTocSidebar}
              tocActive={tocSidebarOpen}
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
            // Chapter label stays a passive hint (the contents TOGGLE lives in
            // the format controls); the page number is now an editable jump
            // field. Chapter label hides on narrow bars so the input has room.
            <div className="flex min-w-0 items-center gap-2">
              {chapterLabel && (
                <span className="hidden min-w-0 max-w-[9rem] truncate text-xs text-reader-fg/60 md:inline">
                  {chapterLabel}
                </span>
              )}
              <PageJumpInput
                current={bookPage}
                total={pageMap?.total ?? null}
                onJump={jumpToBookPage}
                percent={percent}
              />
            </div>
          }
        />
      </div>
    </div>
  );
}

// Icons for the hidden "Download as PDF" toolbar button — restore with it:
// function DownloadIcon() {
//   return (
//     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <path
//         d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M4.5 19.5h15"
//         stroke="currentColor"
//         strokeWidth="1.75"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//     </svg>
//   );
// }
//
// function SpinnerIcon() {
//   return (
//     <svg
//       width="18"
//       height="18"
//       viewBox="0 0 24 24"
//       fill="none"
//       aria-hidden="true"
//       className="motion-safe:animate-spin"
//     >
//       <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" opacity="0.25" />
//       <path
//         d="M21 12a9 9 0 00-9-9"
//         stroke="currentColor"
//         strokeWidth="1.75"
//         strokeLinecap="round"
//       />
//     </svg>
//   );
// }

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
