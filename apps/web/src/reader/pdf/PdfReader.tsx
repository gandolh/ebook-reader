import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";

// react-pdf's required layer CSS (text layer = selection/search; annotation
// layer = links). Without these the text layer is mispositioned. Paths per the
// installed package (react-pdf@10.4.1 ships them under dist/Page/).
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// Import for side effect: configures the PDF.js worker for Vite (see file).
import "./pdf-worker";

import { useReaderStore } from "../../store/reader-store";
import {
  HomeButton,
  PageNav,
  ProgressIndicator,
  ProgressRail,
  ReaderToolbar,
  SearchPanel,
  SettingsPopover,
  ThemePicker,
  ToolbarButton,
  TocDrawer,
  type RailTick,
  type SearchMatch,
  type TocEntry,
  useApplyTheme,
  useAutoHideChrome,
  usePageNavKeys,
} from "../chrome";
import { PdfControls } from "./PdfControls";
import { usePdfOutline } from "./use-pdf-outline";
import { createPdfSearchProvider } from "./pdf-search";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;

// Passed to <Document options>. MUST be a stable reference (react-pdf compares
// by identity and reloads the doc otherwise) — hence module-scope. Leaving it
// empty is fine; react-pdf resolves cmaps/fonts from the bundled pdfjs-dist.
const DOCUMENT_OPTIONS = {} as const;

/**
 * PDF reader (brief 06). Wraps react-pdf (PDF.js) with the shared Kindle-style
 * chrome. Loads the in-memory `File` from Zustand (`loadedFile`, handed over by
 * the uploader — brief 05). Fixed-layout: pages are navigated, zoomed, and (for
 * "dark") colour-inverted rather than reflowed.
 *
 * Wiring to Zustand: `currentLocation` (page number), `zoom`, `theme`,
 * `chromeVisible`.
 */
export function PdfReader({ file }: { file: File }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLocation = useReaderStore((s) => s.currentLocation);
  const setCurrentLocation = useReaderStore((s) => s.setCurrentLocation);
  const zoom = useReaderStore((s) => s.zoom);
  const setZoom = useReaderStore((s) => s.setZoom);
  const theme = useReaderStore((s) => s.theme);
  const setTheme = useReaderStore((s) => s.setTheme);
  const chromeVisible = useReaderStore((s) => s.chromeVisible);

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Query to highlight on the rendered page after a search jump (D19 follow-up:
  // landing on the right page without marking the match strands the reader).
  const [highlightQuery, setHighlightQuery] = useState<string | null>(null);

  // Fixed-layout PDFs can't be re-themed, so "dark" = invert the canvas.
  const inverted = theme === "dark";

  const currentPage = typeof currentLocation === "number" ? currentLocation : 1;

  // Shared chrome behaviors.
  useApplyTheme();
  useAutoHideChrome();

  // Start on page 1 when a new document mounts.
  useEffect(() => {
    setCurrentLocation(1);
  }, [file, setCurrentLocation]);

  // Report coarse progress (page / total) for the library sync hook (D24).
  useEffect(() => {
    if (numPages && numPages > 0) {
      useReaderStore.getState().setProgressFraction(Math.min(currentPage / numPages, 1));
    }
  }, [currentPage, numPages]);

  // Track available width so fit-width can size the page to the viewport.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onLoadSuccess = useCallback(
    (doc: PDFDocumentProxy) => {
      setNumPages(doc.numPages);
      setPdfDoc(doc);
    },
    [],
  );

  const tocEntries = usePdfOutline(pdfDoc);
  const hasToc = tocEntries.length > 0;

  // Chapter ticks for the scrub rail (brief 08): top-level outline entries that
  // resolved to a page. Empty (tickless rail) when the PDF has no outline.
  const railTicks = useMemo<RailTick[]>(() => {
    if (!numPages) return [];
    return tocEntries
      .filter((e) => e.depth === 0 && typeof e.target === "number")
      .map((e) => ({
        pct: (((e.target as number) - 1) / numPages) * 100,
        label: e.label,
      }));
  }, [tocEntries, numPages]);

  const goToPage = useCallback(
    (page: number) => {
      if (numPages === null) return;
      const clamped = Math.min(Math.max(page, 1), numPages);
      setCurrentLocation(clamped);
    },
    [numPages, setCurrentLocation],
  );

  const onPrev = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);
  const onNext = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);

  // Scrub-rail seek: 0–100 → 1-based page, matching the rail tooltip's own
  // pct→page mapping so the release lands on the page it previewed.
  const onSeekRail = useCallback(
    (pct: number) => {
      if (!numPages) return;
      goToPage(Math.max(1, Math.round((pct / 100) * numPages)));
    },
    [numPages, goToPage],
  );

  usePageNavKeys({ onPrev, onNext });

  const onZoomIn = useCallback(
    () => setZoom(Math.min(MAX_ZOOM, Math.round((zoom + ZOOM_STEP) * 100) / 100)),
    [zoom, setZoom],
  );
  const onZoomOut = useCallback(
    () => setZoom(Math.max(MIN_ZOOM, Math.round((zoom - ZOOM_STEP) * 100) / 100)),
    [zoom, setZoom],
  );
  // Fit-width resets zoom to 1 and lets the page track the container width.
  const onFitWidth = useCallback(() => setZoom(1), [setZoom]);

  // "Invert colours" dark hack: toggle the theme between dark (inverted canvas)
  // and light. PDF has no sepia/full theming — this is the fixed-layout dark
  // mode (wiki/reader.md: PDF = "invert-only").
  const onToggleInvert = useCallback(
    () => setTheme(inverted ? "light" : "dark"),
    [inverted, setTheme],
  );

  const onNavigateToc = useCallback(
    (entry: TocEntry) => {
      if (typeof entry.target === "number") goToPage(entry.target);
      setTocOpen(false);
    },
    [goToPage],
  );

  // In-book search (brief 07, additive): search-on-demand over the PDF.js text
  // layer. Provider is bound to the loaded document; jumping sets the page.
  const searchProvider = useMemo(
    () => (pdfDoc ? createPdfSearchProvider(pdfDoc) : null),
    [pdfDoc],
  );
  const onJumpToMatch = useCallback(
    (match: SearchMatch, query: string) => {
      if (typeof match.target === "number") {
        goToPage(match.target);
        setHighlightQuery(query);
      }
    },
    [goToPage],
  );

  // react-pdf renders this return value as HTML (dangerouslySetInnerHTML), so
  // escape the text item before wrapping query matches in <mark>.
  const customTextRenderer = useMemo(() => {
    if (!highlightQuery) return undefined;
    const needle = highlightQuery.toLowerCase();
    const escapeHtml = (s: string) =>
      s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    return ({ str }: { str: string }) => {
      const haystack = str.toLowerCase();
      let idx = haystack.indexOf(needle);
      if (idx === -1) return escapeHtml(str);
      let html = "";
      let from = 0;
      while (idx !== -1) {
        html += escapeHtml(str.slice(from, idx));
        html += `<mark>${escapeHtml(str.slice(idx, idx + needle.length))}</mark>`;
        from = idx + needle.length;
        idx = haystack.indexOf(needle, from);
      }
      return html + escapeHtml(str.slice(from));
    };
  }, [highlightQuery]);

  // Fit-width base: page fills the container; `zoom` multiplies on top of it.
  const pageWidth = useMemo(() => {
    if (containerWidth === null) return undefined;
    // Leave a little horizontal breathing room.
    const base = Math.min(containerWidth - 32, 1000);
    return Math.max(base, 200) * zoom;
  }, [containerWidth, zoom]);

  return (
    <div className="fixed inset-0 top-0 flex flex-col bg-reader-bg">
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        // Invert-colours "dark" hack for the fixed-layout PDF. hue-rotate keeps
        // colour images roughly sane while the page goes dark-on-light → light-
        // on-dark. Applied to the canvas wrapper only, so the chrome stays themed
        // normally.
        style={inverted ? { filter: "invert(1) hue-rotate(180deg)" } : undefined}
      >
        <div className="flex min-h-full justify-center py-6">
          <Document
            file={file}
            onLoadSuccess={onLoadSuccess}
            options={DOCUMENT_OPTIONS}
            loading={<LoadingState />}
            error={<ErrorState />}
            className="max-w-full"
          >
            <Page
              pageNumber={currentPage}
              width={pageWidth}
              renderTextLayer
              renderAnnotationLayer
              customTextRenderer={customTextRenderer}
              className="shadow-lg"
            />
          </Document>
        </div>
      </div>

      <PageNav
        onPrev={onPrev}
        onNext={onNext}
        canPrev={currentPage > 1}
        canNext={numPages !== null && currentPage < numPages}
      />

      {numPages !== null && numPages > 0 && (
        <ProgressRail
          percent={(currentPage / numPages) * 100}
          totalPages={numPages}
          ticks={railTicks}
          visible={chromeVisible}
          onSeek={onSeekRail}
        />
      )}

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
        // The `formatControls` slot IS the format-adaptive seam — PDF fills it
        // here; brief 07 fills it with EPUB font/theme controls (same shell).
        formatControls={
          <PdfControls
            zoom={zoom}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onFitWidth={onFitWidth}
            inverted={inverted}
            onToggleInvert={onToggleInvert}
            hasToc={hasToc}
            onOpenToc={() => setTocOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
          />
        }
        rightControls={
          <>
            <ProgressIndicator current={currentPage} total={numPages} />
            <SettingsPopover
              title="Reader settings"
              trigger={
                <ToolbarButton label="Reader settings">
                  <SettingsIcon />
                </ToolbarButton>
              }
            >
              <ThemePicker />
              <p className="text-xs text-reader-fg/60">
                PDF is fixed-layout: "Dark" inverts the page colours; font
                controls are EPUB-only.
              </p>
            </SettingsPopover>
          </>
        }
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid place-items-center py-20 text-sm text-reader-fg/60">
      Loading PDF…
    </div>
  );
}

function ErrorState() {
  return (
    <div className="grid place-items-center py-20 text-sm text-red-500">
      Failed to load PDF.
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.2.61.75 1.05 1.42 1.09H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}
