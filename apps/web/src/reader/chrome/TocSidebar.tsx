import { useEffect, useRef } from "react";

import type { TocEntry } from "./TocDrawer";

/**
 * Docked contents sidebar — the persistent counterpart to `TocDrawer`. Where
 * the drawer is a summoned overlay, this pins open and the reading column
 * shifts to make room (the reader lays it out as a flex sibling). Its open
 * state is a remembered preference (see the store's `tocSidebarOpen`).
 *
 * Kept deliberately quiet: same warm surface as the page, a hairline divider,
 * the current chapter marked with an accent dot. No dashboard chrome.
 */
export function TocSidebar({
  open,
  entries,
  onNavigate,
  onClose,
  currentId = null,
  title = "Contents",
}: {
  open: boolean;
  entries: TocEntry[];
  onNavigate: (entry: TocEntry) => void;
  onClose: () => void;
  /** Entry id of the chapter currently being read — highlighted + scrolled to. */
  currentId?: string | null;
  title?: string;
}) {
  // Keep the current chapter in view when it changes or the panel opens — an
  // initial position, not an animated movement (reading state is sacred).
  const currentRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      currentRef.current?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [open, currentId]);

  return (
    <aside
      // Width animates so the reading column reflows smoothly; when closed the
      // panel collapses to zero width and stops taking pointer events. The
      // whole reader honors prefers-reduced-motion via the crossfade veil, so
      // this width transition is disabled under reduced motion too.
      // `inert` (when collapsed) pulls the clipped list out of the a11y tree
      // and tab order — otherwise the hidden entries stay focusable/announced
      // even at zero width.
      inert={!open}
      className={`h-full shrink-0 overflow-hidden border-r border-reader-border bg-reader-bg transition-[width] duration-200 motion-reduce:transition-none ${
        open ? "w-72" : "w-0 border-r-0"
      }`}
    >
      {/* Fixed inner width so content doesn't reflow while the panel animates. */}
      <div className="flex h-full w-72 flex-col">
        <div className="flex items-center justify-between border-b border-reader-border px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide contents"
            title="Hide contents"
            className="grid h-8 w-8 place-items-center rounded-md text-reader-fg/70 hover:bg-reader-surface"
          >
            <CollapseIcon />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {entries.length === 0 ? (
            <p className="px-2 py-4 text-sm text-reader-fg/60">
              No table of contents available.
            </p>
          ) : (
            <ul>
              {entries.map((entry) => {
                const isCurrent = currentId !== null && entry.id === currentId;
                return (
                  <li key={entry.id} ref={isCurrent ? currentRef : undefined}>
                    <button
                      type="button"
                      onClick={() => onNavigate(entry)}
                      aria-current={isCurrent ? "true" : undefined}
                      style={{ paddingLeft: `${0.5 + entry.depth * 0.75}rem` }}
                      className={`relative block w-full rounded-md py-1.5 pr-2 text-left text-sm transition-colors ${
                        isCurrent
                          ? "bg-reader-surface font-medium text-reader-fg"
                          : "text-reader-fg/85 hover:bg-reader-surface"
                      }`}
                    >
                      {isCurrent && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-reader-accent"
                        />
                      )}
                      {entry.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </div>
    </aside>
  );
}

function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
