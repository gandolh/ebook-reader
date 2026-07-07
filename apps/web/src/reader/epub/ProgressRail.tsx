import { useCallback, useRef, useState } from "react";

/** A chapter boundary on the rail, as a 0–100 percentage plus its title. */
export interface RailTick {
  pct: number;
  label: string;
}

/**
 * Scrubbable reading-progress rail (the reader's one moment of delight).
 * A hairline strip along the very bottom edge: accent-filled to the current
 * position, faint ticks at chapter boundaries. Hovering reveals the chapter
 * under the pointer; clicking (or arrow keys when focused) jumps there.
 * Appears and fades with the rest of the chrome; never steals reading space.
 */
export function ProgressRail({
  percent,
  totalPages,
  ticks,
  visible,
  onSeek,
}: {
  /** Current position, 0–100. */
  percent: number;
  /** Total location-based page count; tooltip shows pages when available. */
  totalPages?: number | null;
  ticks: RailTick[];
  visible: boolean;
  /** Jump to a 0–100 position. */
  onSeek: (pct: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; pct: number } | null>(null);

  const pctFromEvent = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  }, []);

  const chapterAt = useCallback(
    (pct: number): string | null => {
      let label: string | null = null;
      for (const t of ticks) {
        if (t.pct <= pct) label = t.label;
        else break;
      }
      return label;
    },
    [ticks],
  );

  const hoverLabel = hover ? chapterAt(hover.pct) : null;

  return (
    <div
      // While hovered the rail (and its tooltip) must rise above the toolbar
      // pill (z-30), which otherwise paints over the tooltip.
      className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${
        hover ? "z-40" : "z-20"
      } ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      {hover && (
        <div
          className="pointer-events-none absolute bottom-5 -translate-x-1/2 whitespace-nowrap rounded-md border border-reader-border bg-reader-surface px-2 py-1 text-xs text-reader-fg shadow-md"
          style={{ left: hover.x }}
        >
          {hoverLabel ? `${hoverLabel} · ` : ""}
          {totalPages
            ? `${Math.max(1, Math.min(totalPages, Math.round((hover.pct / 100) * totalPages)))}/${totalPages}`
            : `${Math.round(hover.pct)}%`}
        </div>
      )}

      <div
        ref={trackRef}
        role="slider"
        aria-label="Reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        tabIndex={0}
        className="group relative h-4 cursor-pointer outline-none"
        onMouseMove={(e) => setHover({ x: e.clientX, pct: pctFromEvent(e.clientX) })}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => onSeek(pctFromEvent(e.clientX))}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            // Don't let the global page-turn keys double-handle this.
            e.preventDefault();
            e.stopPropagation();
            const delta = e.key === "ArrowLeft" ? -2 : 2;
            onSeek(Math.min(100, Math.max(0, percent + delta)));
          }
        }}
      >
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-reader-border/60 transition-all duration-150 group-hover:h-[6px] group-focus-visible:h-[6px] group-focus-visible:ring-1 group-focus-visible:ring-reader-accent">
          <div
            className="h-full bg-reader-accent"
            style={{ width: `${percent}%` }}
          />
          {ticks.map((t) => (
            <span
              key={`${t.pct}-${t.label}`}
              className="absolute bottom-0 h-full w-px bg-reader-fg/25"
              style={{ left: `${t.pct}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
