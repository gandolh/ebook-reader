import type { ReactNode } from "react";

import { ToolbarButton } from "../chrome";

/**
 * PDF-specific toolbar controls (brief 06). These fill the `formatControls`
 * slot of the shared `ReaderToolbar` — the SAME format-adaptive seam the EPUB
 * reader uses (it swaps in TOC + search + font settings; PDF swaps in
 * zoom/invert + the theme settings trigger below).
 *
 * Controls (wiki/reader.md PDF row): zoom out / fit-width / zoom in, plus an
 * "invert colors" dark toggle (the only viable dark mode for a fixed-layout
 * PDF, since real theming can't recolor the rendered canvas). The settings
 * popover trigger (theme picker) is passed in as `settingsTrigger` so it sits
 * inline with the other buttons, mirroring `EpubControls`.
 */
export function PdfControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  inverted,
  onToggleInvert,
  hasToc,
  onOpenToc,
  onOpenSearch,
  settingsTrigger,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  inverted: boolean;
  onToggleInvert: () => void;
  /** Only render the TOC button when the PDF has an outline (open-question resolution). */
  hasToc: boolean;
  onOpenToc: () => void;
  /** Open the shared in-book search panel (brief 07, additive). */
  onOpenSearch: () => void;
  /** The settings popover trigger (theme picker + the fixed-layout note). */
  settingsTrigger?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1">
      {hasToc && (
        <ToolbarButton label="Table of contents" onClick={onOpenToc}>
          <TocIcon />
        </ToolbarButton>
      )}
      <ToolbarButton label="Search in book" onClick={onOpenSearch}>
        <SearchIcon />
      </ToolbarButton>

      <ToolbarButton label="Zoom out" onClick={onZoomOut} disabled={zoom <= 0.5}>
        <MinusIcon />
      </ToolbarButton>
      <span className="min-w-12 text-center text-xs tabular-nums text-reader-fg/70">
        {Math.round(zoom * 100)}%
      </span>
      <ToolbarButton label="Zoom in" onClick={onZoomIn} disabled={zoom >= 3}>
        <PlusIcon />
      </ToolbarButton>
      <ToolbarButton label="Fit width" onClick={onFitWidth}>
        <FitWidthIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Invert colors (dark)"
        onClick={onToggleInvert}
        active={inverted}
      >
        <InvertIcon />
      </ToolbarButton>
      {settingsTrigger}
    </div>
  );
}

function icon(children: ReactNode) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const MinusIcon = () => icon(<path d="M5 12h14" {...stroke} />);
const PlusIcon = () => icon(<path d="M12 5v14M5 12h14" {...stroke} />);
const FitWidthIcon = () =>
  icon(<path d="M3 12h18M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" {...stroke} />);
const InvertIcon = () =>
  icon(
    <>
      <circle cx="12" cy="12" r="9" {...stroke} />
      <path d="M12 3a9 9 0 000 18z" fill="currentColor" />
    </>,
  );
const TocIcon = () =>
  icon(<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" {...stroke} />);
const SearchIcon = () =>
  icon(
    <>
      <circle cx="11" cy="11" r="7" {...stroke} />
      <path d="M21 21l-4.3-4.3" {...stroke} />
    </>,
  );
