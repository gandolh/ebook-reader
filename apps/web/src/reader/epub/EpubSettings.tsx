import { SliderControl, ThemePicker } from "../chrome";
import { useReaderStore } from "../../store/reader-store";

/**
 * EPUB settings body (brief 07) — the font/theme controls that make EPUB the
 * "star" reflowable experience. Rendered inside the shared `SettingsPopover`
 * (the other half of the format-adaptive seam). All values live in Zustand
 * (`fontSettings`, `theme`); the reader mirrors them onto the epub.js
 * `rendition.themes` so the reflowed text actually re-typesets/re-colors.
 *
 * Controls (wiki/reader.md EPUB row): font size, font family, line-spacing,
 * margins + full light/sepia/dark themes.
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

  return (
    <>
      <ThemePicker />

      <SliderControl
        label="Font size"
        value={fontSettings.size}
        min={FONT_SIZE.min}
        max={FONT_SIZE.max}
        step={1}
        onValueChange={(size) => setFontSettings({ size })}
        format={(v) => `${v}px`}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-reader-fg/70">Font</span>
        <div className="flex gap-1 rounded-md bg-reader-surface p-1">
          {FONT_FAMILIES.map((f) => {
            const selected = fontSettings.family === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFontSettings({ family: f.value })}
                style={{ fontFamily: f.stack }}
                className={`flex-1 rounded px-2 py-1 text-xs transition ${
                  selected
                    ? "bg-reader-bg text-reader-fg shadow-sm"
                    : "text-reader-fg/70"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
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
