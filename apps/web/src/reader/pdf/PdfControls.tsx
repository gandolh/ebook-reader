import type { ReactNode } from "react";

import { ToolbarButton } from "../chrome";

/**
 * PDF-specific toolbar controls (brief 06). These fill the `formatControls`
 * slot of the shared `ReaderToolbar` — the format-adaptive seam. Brief 07's
 * EPUB reader swaps this out for font/theme controls without touching the shell.
 *
 * Controls (wiki/reader.md PDF row): zoom out / fit-width / zoom in, plus an
 * "invert colors" dark toggle (the only viable dark mode for a fixed-layout
 * PDF, since real theming can't recolor the rendered canvas).
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
}) {
  return (
    <div className="flex items-center gap-1">
      {hasToc && (
        <ToolbarButton label="Table of contents" onClick={onOpenToc}>
          <TocIcon />
        </ToolbarButton>
      )}

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
  strokeWidth: 2,
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
