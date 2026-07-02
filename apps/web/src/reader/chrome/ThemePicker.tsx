import { useReaderStore, type Theme } from "../../store/reader-store";

/**
 * Theme swatches per theme, mirroring the `--reader-*` tokens (globals.css) so
 * each swatch is a truthful miniature of the page it produces.
 */
const THEMES: { value: Theme; label: string; bg: string; fg: string; border: string }[] = [
  { value: "light", label: "Light", bg: "#ffffff", fg: "#1a1a1a", border: "#e2e2e2" },
  { value: "sepia", label: "Sepia", bg: "#f4ecd8", fg: "#3b2f1e", border: "#d9c9a3" },
  { value: "dark", label: "Dark", bg: "#181818", fg: "#e8e8e8", border: "#3a3a3a" },
];

/**
 * Shared light/sepia/dark theme picker (wiki/reader.md), drawn as three
 * miniature pages — an "Aa" set on each theme's actual paper — the pattern a
 * Kindle/Books hand already knows. Writes to Zustand's `theme`;
 * `useApplyTheme` reflects it onto `data-theme`.
 *
 * Both readers render this in their settings surface. For EPUB the theme fully
 * re-colors the reflowed text; for PDF only the chrome themes and "dark" maps
 * to the invert hack — but the control itself is shared.
 */
export function ThemePicker() {
  const theme = useReaderStore((s) => s.theme);
  const setTheme = useReaderStore((s) => s.setTheme);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-reader-fg/70">Theme</span>
      <div role="radiogroup" aria-label="Theme" className="flex gap-2">
        {THEMES.map((t) => {
          const selected = theme === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(t.value)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-reader-accent`}
            >
              <span
                aria-hidden="true"
                className={`grid h-11 w-full place-items-center rounded-lg border text-base transition-shadow ${
                  selected ? "ring-2 ring-reader-accent" : ""
                }`}
                style={{
                  backgroundColor: t.bg,
                  color: t.fg,
                  borderColor: t.border,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                Aa
              </span>
              <span
                className={`text-[11px] ${
                  selected ? "font-medium text-reader-fg" : "text-reader-fg/60"
                }`}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
