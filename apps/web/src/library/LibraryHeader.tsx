import type { ReactNode } from "react";

import type { Theme } from "../store/reader-store";
import { useReaderStore } from "../store/reader-store";

/**
 * The library header (wiki/design.md): wordmark in Playfair on the left, a
 * segmented theme toggle (light / sepia / dark) on the right. Mirrors the
 * mockup's sun / book / moon control. Drives the shared `theme` store so the
 * library and the readers stay in sync.
 */

const THEMES: { value: Theme; label: string; glyph: ReactNode }[] = [
  { value: "light", label: "Light theme", glyph: <SunGlyph /> },
  { value: "sepia", label: "Sepia theme", glyph: <BookGlyph /> },
  { value: "dark", label: "Dark theme", glyph: <MoonGlyph /> },
];

export function LibraryHeader() {
  const theme = useReaderStore((s) => s.theme);
  const setTheme = useReaderStore((s) => s.setTheme);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line-soft/50 pb-5">
      <h1 className="font-display text-2xl font-bold tracking-tight text-accent">
        ebook-reader
      </h1>

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
              className={`grid h-8 w-9 place-items-center rounded-full transition ${
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
    </header>
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
