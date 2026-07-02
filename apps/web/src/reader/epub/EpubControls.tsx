import type { ReactNode } from "react";

import { ToolbarButton } from "../chrome";

/**
 * EPUB-specific toolbar controls (brief 07). These fill the `formatControls`
 * slot of the shared `ReaderToolbar` — the SAME format-adaptive seam the PDF
 * reader uses (it swaps in zoom/invert; EPUB swaps in TOC + search + the font
 * settings trigger). The shell (`ReaderToolbar`) is untouched.
 *
 * The heavier font/theme controls live in the settings popover (passed as
 * `settingsTrigger` here so it sits inline with the other buttons); the strip
 * itself stays compact like the PDF one.
 */
export function EpubControls({
  onOpenToc,
  hasToc,
  onOpenSearch,
  settingsTrigger,
}: {
  onOpenToc: () => void;
  hasToc: boolean;
  onOpenSearch: () => void;
  /** The settings popover trigger (font/family/spacing/margins + theme). */
  settingsTrigger: ReactNode;
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
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TocIcon = () =>
  icon(<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" {...stroke} />);
const SearchIcon = () =>
  icon(
    <>
      <circle cx="11" cy="11" r="7" {...stroke} />
      <path d="M21 21l-4.3-4.3" {...stroke} />
    </>,
  );
