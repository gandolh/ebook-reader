import { type ReactNode } from "react";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FORMAT-ADAPTIVE TOOLBAR SEAM  (the crux of brief 06 for brief 07)
 * ─────────────────────────────────────────────────────────────────────────────
 * `ReaderToolbar` is the SHARED chrome shell used by BOTH readers. The shell
 * owns the layout (an always-visible in-flow bottom bar) and three named
 * slots. The format-specific reader fills the slots:
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
  return (
    // In-flow bottom row of the reader's 3-row grid (top bar / content / this),
    // always visible. The wrapper never eats pointer events — the progress rail
    // sits at the very bottom edge beneath it; only the pill is interactive.
    <div className="pointer-events-none relative z-30 w-full shrink-0">
      {/* Single-line pill: justify-between spreads the three control clusters;
          the right cluster (min-w-0) truncates rather than wrapping to a
          second row. */}
      <div className="pointer-events-auto mx-auto mb-3 flex w-full max-w-3xl items-center justify-between gap-3 rounded-2xl border border-reader-border/80 bg-reader-surface/95 px-3 py-2 shadow-xl shadow-black/5 backdrop-blur">
        <div className="flex shrink-0 items-center gap-1">{leftControls}</div>
        <div className="flex shrink-0 items-center gap-1">{formatControls}</div>
        <div className="flex min-w-0 items-center justify-end gap-2">
          {rightControls}
        </div>
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
