import { SliderControl, ThemePicker } from "../chrome";
import { useReaderStore } from "../../store/reader-store";

/**
 * EPUB settings body (the "Aa" panel) — the font/theme controls that make EPUB
 * the "star" reflowable experience. Rendered inside the shared
 * `SettingsPopover`. All values live in Zustand (`fontSettings`, `theme`); the
 * reader mirrors them onto the epub.js `rendition.themes` so the reflowed text
 * actually re-typesets/re-colors.
 *
 * Grammar borrowed from Kindle/Books: theme swatches as miniature pages, font
 * choices shown as specimens in their own face, A−/A+ steppers flanking the
 * size slider.
 */

/** Font family options mapped to concrete CSS stacks epub.js can apply. */
export const FONT_FAMILIES: { label: string; value: string; stack: string }[] = [
  { label: "Serif", value: "serif", stack: "Georgia, 'Times New Roman', serif" },
  { label: "Sans", value: "sans", stack: "system-ui, -apple-system, Helvetica, Arial, sans-serif" },
  { label: "Mono", value: "mono", stack: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace" },
];

export function fontStackFor(value: string): string {
  return FONT_FAMILIES.find((f) => f.value === value)?.stack ?? FONT_FAMILIES[0].stack;
}

// Bounds shared with the reader's theme application.
export const FONT_SIZE = { min: 12, max: 32 };
export const LINE_SPACING = { min: 1.2, max: 2.2 };
export const MARGINS = { min: 0, max: 80 };

export function EpubSettings() {
  const fontSettings = useReaderStore((s) => s.fontSettings);
  const setFontSettings = useReaderStore((s) => s.setFontSettings);

  const stepSize = (delta: number) =>
    setFontSettings({
      size: Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, fontSettings.size + delta)),
    });

  return (
    <>
      <ThemePicker />

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-reader-fg/70">Font</span>
        <div role="radiogroup" aria-label="Font" className="flex gap-2">
          {FONT_FAMILIES.map((f) => {
            const selected = fontSettings.family === f.value;
            return (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setFontSettings({ family: f.value })}
                className="flex flex-1 flex-col items-center gap-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-reader-accent"
              >
                <span
                  aria-hidden="true"
                  className={`grid h-11 w-full place-items-center rounded-lg border border-reader-border bg-reader-surface text-base text-reader-fg transition-shadow ${
                    selected ? "ring-2 ring-reader-accent" : ""
                  }`}
                  style={{ fontFamily: f.stack }}
                >
                  Aa
                </span>
                <span
                  className={`text-[11px] ${
                    selected ? "font-medium text-reader-fg" : "text-reader-fg/60"
                  }`}
                >
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-end gap-2">
        <button
          type="button"
          aria-label="Decrease font size"
          onClick={() => stepSize(-1)}
          disabled={fontSettings.size <= FONT_SIZE.min}
          className="grid h-8 w-9 shrink-0 place-items-center rounded-lg border border-reader-border text-xs text-reader-fg/80 transition hover:bg-reader-surface disabled:opacity-30"
        >
          A−
        </button>
        <div className="min-w-0 flex-1">
          <SliderControl
            label="Font size"
            value={fontSettings.size}
            min={FONT_SIZE.min}
            max={FONT_SIZE.max}
            step={1}
            onValueChange={(size) => setFontSettings({ size })}
            format={(v) => `${v}px`}
          />
        </div>
        <button
          type="button"
          aria-label="Increase font size"
          onClick={() => stepSize(1)}
          disabled={fontSettings.size >= FONT_SIZE.max}
          className="grid h-8 w-9 shrink-0 place-items-center rounded-lg border border-reader-border text-base text-reader-fg/80 transition hover:bg-reader-surface disabled:opacity-30"
        >
          A+
        </button>
      </div>

      <SliderControl
        label="Line spacing"
        value={fontSettings.lineSpacing}
        min={LINE_SPACING.min}
        max={LINE_SPACING.max}
        step={0.1}
        onValueChange={(lineSpacing) =>
          setFontSettings({ lineSpacing: Math.round(lineSpacing * 10) / 10 })
        }
        format={(v) => v.toFixed(1)}
      />

      <SliderControl
        label="Margins"
        value={fontSettings.margins}
        min={MARGINS.min}
        max={MARGINS.max}
        step={4}
        onValueChange={(margins) => setFontSettings({ margins })}
        format={(v) => `${v}px`}
      />
    </>
  );
}
