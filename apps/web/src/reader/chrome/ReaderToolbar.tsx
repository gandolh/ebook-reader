import type { ReactNode } from "react";

import { useReaderStore } from "../../store/reader-store";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FORMAT-ADAPTIVE TOOLBAR SEAM  (the crux of brief 06 for brief 07)
 * ─────────────────────────────────────────────────────────────────────────────
 * `ReaderToolbar` is the SHARED chrome shell used by BOTH readers. The shell
 * owns the fixed layout, the auto-hide fade (driven by Zustand `chromeVisible`),
 * and three named slots. The format-specific reader fills the slots:
 *
 *   - `leftControls`   → TOC button, back-to-home, etc. (per format).
 *   - `formatControls` → the ADAPTIVE region. This is where the toolbar's
 *                        controls swap by format (wiki/reader.md
 *                        "Format-adaptive toolbar"):
 *                          • PDF  (brief 06): zoom out / fit-width / zoom in +
 *                            an "invert colors" dark toggle.
 *                          • EPUB (brief 07): font size / family / line-spacing
 *                            / margins + the full theme picker.
 *   - `rightControls`  → progress indicator, settings popover trigger, etc.
 *
 * Brief 07 REUSES this component verbatim — it does NOT fork it. It only passes
 * different slot contents. Keep this shell format-agnostic: no `format`
 * branching, no PDF/EPUB imports here. If a control needs format knowledge,
 * it belongs in the slot the reader supplies, not in this file.
 *
 * The paired seam for pop-out settings is `SettingsPopover` (also slot-driven).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ReaderToolbar({
  leftControls,
  formatControls,
  rightControls,
}: {
  leftControls?: ReactNode;
  formatControls?: ReactNode;
  rightControls?: ReactNode;
}) {
  const chromeVisible = useReaderStore((s) => s.chromeVisible);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 transition-all duration-300 ${
        chromeVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <div className="mx-auto mb-3 flex max-w-3xl items-center gap-2 rounded-xl border border-reader-border bg-reader-surface/95 px-3 py-2 shadow-lg backdrop-blur">
        <div className="flex items-center gap-1">{leftControls}</div>
        <div className="flex flex-1 items-center justify-center gap-1">
          {formatControls}
        </div>
        <div className="flex items-center gap-2">{rightControls}</div>
      </div>
    </div>
  );
}

/**
 * Shared toolbar button styling so PDF and EPUB controls look consistent.
 * Exported for reuse by brief 07's EPUB controls.
 */
export function ToolbarButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid h-9 min-w-9 place-items-center rounded-lg px-2 text-reader-fg/80 transition hover:bg-reader-bg disabled:opacity-30 ${
        active ? "bg-reader-accent/15 text-reader-accent" : ""
      }`}
    >
      {children}
    </button>
  );
}
