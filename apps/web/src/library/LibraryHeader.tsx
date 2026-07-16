import { Link } from "@tanstack/react-router";
import { useRef, type KeyboardEvent, type ReactNode } from "react";

import type { Theme } from "../store/reader-store";
import { useReaderStore } from "../store/reader-store";
import type { GroupView } from "../lib/library-prefs";

/**
 * The library header (wiki/design.md): wordmark in Playfair on the left, a
 * segmented theme toggle (light / sepia / dark) on the right. Mirrors the
 * mockup's sun / book / moon control. Drives the shared `theme` store so the
 * library and the readers stay in sync.
 *
 * Brief 20 item 2 adds an unobtrusive storage-used caption under the
 * wordmark, shown only once at least one book is downloaded — nothing to
 * report otherwise, so nothing renders.
 *
 * Brief 22 adds the quiet "Browse catalogs" link (→ `/discover`) at the start
 * of the right-side cluster, ahead of the view toggle and theme control.
 */

const THEMES: { value: Theme; label: string; glyph: ReactNode }[] = [
  { value: "light", label: "Light theme", glyph: <SunGlyph /> },
  { value: "sepia", label: "Sepia theme", glyph: <BookGlyph /> },
  { value: "dark", label: "Dark theme", glyph: <MoonGlyph /> },
];

export function LibraryHeader({
  storage,
  downloadedCount,
  view,
  onViewChange,
  showViewToggle = false,
}: {
  /** `useOfflineDownload().storage` — the origin's platform-wide usage/quota. */
  storage?: { usage: number; quota: number } | null;
  /** `useOfflineDownload().downloaded.length` — gates whether to show `storage` at all. */
  downloadedCount?: number;
  /** Current grouped-gallery view (brief 21). Ignored while `showViewToggle` is false. */
  view?: GroupView;
  /** Set the grouped-gallery view. */
  onViewChange?: (view: GroupView) => void;
  /** Whether to render the Shelves⇄Stacks toggle — only while Group by ≠ None. */
  showViewToggle?: boolean;
}) {
  const theme = useReaderStore((s) => s.theme);
  const setTheme = useReaderStore((s) => s.setTheme);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line-soft/50 pb-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-accent">
          ebook-reader
        </h1>
        <StorageCaption storage={storage} downloadedCount={downloadedCount ?? 0} />
      </div>

      <div className="flex items-center gap-3">
        {/* Quiet entry point into the catalog (brief 22) — a plain link, not a
            button; accent is fine here since it's a link (design.md: accent
            spent on active values/links/progress). */}
        <Link
          to="/discover"
          className="font-ui text-sm text-ink-variant transition hover:text-accent"
        >
          Browse catalogs
        </Link>

        {showViewToggle && view && onViewChange && (
          <ViewToggle view={view} onViewChange={onViewChange} />
        )}

        <div
          role="radiogroup"
          aria-label="Theme"
          className="flex items-center gap-0.5 rounded-full border border-line-soft/60 bg-paper-low p-0.5"
        >
          {THEMES.map((t) => {
            const active = theme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={t.label}
                title={t.label}
                onClick={() => setTheme(t.value)}
                className={`grid h-9 w-11 place-items-center rounded-full transition ${
                  active
                    ? "bg-paper-raised text-accent shadow-sm"
                    : "text-ink-variant hover:text-ink"
                }`}
              >
                {t.glyph}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

const VIEWS: { value: GroupView; label: string }[] = [
  { value: "shelves", label: "Shelves" },
  { value: "stacks", label: "Stacks" },
];

/**
 * The Shelves⇄Stacks view toggle (brief 21 step 5). A two-segment Quiet Paper
 * control: Inter `label-caps`, hairline border, 4px radius, active fill
 * `paper-container-high` — deliberately **no accent** on the control itself
 * (accent is reserved for active values/links; the only accent here is the
 * focus ring). A11y: `radiogroup` semantics + roving tabindex, arrow keys move
 * and select, visible primary focus ring.
 */
function ViewToggle({
  view,
  onViewChange,
}: {
  view: GroupView;
  onViewChange: (view: GroupView) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!forward && !back) return;
    e.preventDefault();
    const current = VIEWS.findIndex((v) => v.value === view);
    const next = (current + (forward ? 1 : VIEWS.length - 1)) % VIEWS.length;
    onViewChange(VIEWS[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="View"
      onKeyDown={onKeyDown}
      className="flex items-center rounded border border-line-soft/70 p-0.5"
    >
      {VIEWS.map((v, i) => {
        const active = view === v.value;
        return (
          <button
            key={v.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            ref={(el) => {
              refs.current[i] = el;
            }}
            onClick={() => onViewChange(v.value)}
            className={`rounded-[2px] px-3 py-1 font-ui text-xs font-semibold tracking-[0.08em] uppercase transition focus-visible:outline-2 focus-visible:outline-accent ${
              active ? "bg-paper-container-high text-ink" : "text-ink-variant hover:text-ink"
            }`}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Storage-used indicator (brief 20 item 2) — a quiet caption, not a widget.
 * Renders nothing until there's something to say: no downloads, or no
 * `storage.estimate()` support, both mean "nothing to report" rather than an
 * error state.
 */
function StorageCaption({
  storage,
  downloadedCount,
}: {
  storage?: { usage: number; quota: number } | null;
  downloadedCount: number;
}) {
  if (downloadedCount === 0 || !storage || storage.quota <= 0) return null;
  const pct = Math.min(100, Math.round((storage.usage / storage.quota) * 100));
  return (
    <p
      className="text-xs text-ink-variant"
      title={`${formatBytes(storage.usage)} used of ${formatBytes(storage.quota)} available on this device`}
    >
      {formatBytes(storage.usage)} offline &middot; {pct}% of device storage
    </p>
  );
}

/** Human-readable byte size (`1536` → `"1.5 KB"`), binary (1024) units. */
function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(value < 10 ? 1 : 0)} ${units[exponent]}`;
}

const ICON = "h-4 w-4";

function SunGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={ICON} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function BookGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={ICON} aria-hidden>
      <path strokeLinejoin="round" d="M12 6c-1.5-1.2-3.7-2-6-2-1 0-2 .1-3 .4v13c1-.3 2-.4 3-.4 2.3 0 4.5.8 6 2 1.5-1.2 3.7-2 6-2 1 0 2 .1 3 .4v-13c-1-.3-2-.4-3-.4-2.3 0-4.5.8-6 2Z" />
      <path strokeLinecap="round" d="M12 6v14" />
    </svg>
  );
}

function MoonGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={ICON} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
    </svg>
  );
}
