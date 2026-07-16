import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { Theme } from "../store/reader-store";
import { useReaderStore } from "../store/reader-store";

/**
 * The persistent app header, shared by every non-reader page (`/`, `/discover`)
 * so navigation and the theme control never disappear when the page changes
 * (previously /discover dropped the shell entirely — no brand, no theme
 * toggle). Wordmark in Playfair on the left (a link home), page-supplied
 * `actions` + the segmented light/sepia/dark toggle on the right.
 *
 * Content-scoped controls (the All/Books/Music/Videos filter, Shelves⇄Stacks)
 * deliberately do NOT live here anymore — they scope the library shelf, so
 * they sit next to it (see routes/home.tsx), leaving the header with app-level
 * concerns only. That also fixes the mobile wrap: two clusters instead of five.
 */
export function AppHeader({
  caption,
  actions,
}: {
  /** Optional quiet caption under the wordmark (home's storage usage). */
  caption?: ReactNode;
  /** Page-level actions, rendered before the theme toggle. */
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line-soft/50 pb-5">
      <div className="flex flex-col gap-1">
        <Link
          to="/"
          className="w-fit rounded font-display text-2xl font-bold tracking-tight text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          ebook-reader
        </Link>
        {caption}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}

const THEMES: { value: Theme; label: string; glyph: ReactNode }[] = [
  { value: "light", label: "Light theme", glyph: <SunGlyph /> },
  { value: "sepia", label: "Sepia theme", glyph: <BookGlyph /> },
  { value: "dark", label: "Dark theme", glyph: <MoonGlyph /> },
];

/**
 * Segmented light/sepia/dark control (design.md mockup's sun/book/moon).
 * Drives the shared reader `theme` store so the library, catalog, and readers
 * stay in sync.
 */
function ThemeToggle() {
  const theme = useReaderStore((s) => s.theme);
  const setTheme = useReaderStore((s) => s.setTheme);

  return (
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
              active ? "bg-paper-raised text-accent shadow-sm" : "text-ink-variant hover:text-ink"
            }`}
          >
            {t.glyph}
          </button>
        );
      })}
    </div>
  );
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
