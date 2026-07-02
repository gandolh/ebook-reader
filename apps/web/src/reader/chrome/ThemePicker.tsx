import { Tabs } from "@base-ui/react/tabs";

import { useReaderStore, type Theme } from "../../store/reader-store";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "sepia", label: "Sepia" },
  { value: "dark", label: "Dark" },
];

/**
 * Shared light/sepia/dark theme picker (wiki/reader.md). Writes to Zustand's
 * `theme`; `useApplyTheme` reflects it onto `data-theme`.
 *
 * Both readers render this in their settings surface. For EPUB (brief 07) the
 * theme fully re-colors the reflowed text; for PDF (brief 06) only the chrome
 * themes and "dark" maps to the invert hack — but the control itself is shared.
 */
export function ThemePicker() {
  const theme = useReaderStore((s) => s.theme);
  const setTheme = useReaderStore((s) => s.setTheme);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-reader-fg/70">Theme</span>
      <Tabs.Root
        value={theme}
        onValueChange={(value) => setTheme(value as Theme)}
      >
        <Tabs.List className="relative flex gap-1 rounded-md bg-reader-surface p-1">
          {THEMES.map((t) => (
            <Tabs.Tab
              key={t.value}
              value={t.value}
              className="flex-1 rounded px-2 py-1 text-xs text-reader-fg/70 select-none data-[selected]:bg-reader-bg data-[selected]:text-reader-fg data-[selected]:shadow-sm"
            >
              {t.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.Root>
    </div>
  );
}
