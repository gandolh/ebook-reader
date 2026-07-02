import { useState, type ReactNode } from "react";

import { useReaderStore } from "../../store/reader-store";
import { useChromeHold } from "./use-auto-hide-chrome";

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
  // Keep the chrome from fading out from under the user: hold it visible
  // while the pointer rests on the toolbar or focus is inside it.
  const [pointerOver, setPointerOver] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  useChromeHold(pointerOver || focusWithin);

  return (
    // The wrapper spans the full bottom strip but must never eat pointer
    // events — the progress rail lives underneath it (z-20). Only the pill
    // itself is interactive, and only while the chrome is visible.
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-30 transition-all duration-300 ${
        chromeVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
      onMouseEnter={() => setPointerOver(true)}
      onMouseLeave={() => setPointerOver(false)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocusWithin(false);
        }
      }}
    >
      {/* flex-wrap: on narrow (mobile) viewports the controls flow onto a
          second row instead of clipping off the right edge. */}
      <div
        className={`mx-auto mb-3 flex max-w-3xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-reader-border/80 bg-reader-surface/95 px-3 py-2 shadow-xl shadow-black/5 backdrop-blur ${
          chromeVisible ? "pointer-events-auto" : ""
        }`}
      >
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
