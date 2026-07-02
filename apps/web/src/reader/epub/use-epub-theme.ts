import { useEffect } from "react";
import type { Rendition } from "epubjs";

import { useReaderStore, type Theme } from "../../store/reader-store";
import { fontStackFor } from "./EpubSettings";

/**
 * Applies the active theme + font settings to the epub.js `rendition` (brief 07
 * step 2). Unlike the fixed-layout PDF (which can only invert), EPUB is
 * reflowable, so real theming works: we recolor the text via themed CSS rules
 * injected into each rendered section, and re-typeset via `themes.fontSize`,
 * `themes.font`, and line-height/margin overrides.
 *
 * These map the SAME `--reader-*` palette the chrome uses (globals.css) so the
 * page and its chrome stay visually consistent across light/sepia/dark.
 */

// Text/background palette per theme (mirrors globals.css `--reader-*` tokens).
const THEME_COLORS: Record<Theme, { bg: string; fg: string; link: string }> = {
  light: { bg: "#ffffff", fg: "#1a1a1a", link: "#2563eb" },
  sepia: { bg: "#f4ecd8", fg: "#3b2f1e", link: "#92400e" },
  dark: { bg: "#181818", fg: "#e8e8e8", link: "#60a5fa" },
};

function themeRules(theme: Theme, lineSpacing: number, margins: number) {
  const c = THEME_COLORS[theme];
  return {
    body: {
      background: `${c.bg} !important`,
      color: `${c.fg} !important`,
      "line-height": `${lineSpacing} !important`,
      "padding-left": `${margins}px !important`,
      "padding-right": `${margins}px !important`,
    },
    // Force text colour through common elements EPUBs style directly, so their
    // own stylesheets don't override the theme (esp. for dark).
    "p, div, span, h1, h2, h3, h4, h5, h6, li, blockquote, td, th": {
      color: `${c.fg} !important`,
    },
    a: { color: `${c.link} !important` },
  };
}

export function useEpubTheme(rendition: Rendition | null) {
  const theme = useReaderStore((s) => s.theme);
  const fontSettings = useReaderStore((s) => s.fontSettings);

  useEffect(() => {
    if (!rendition) return;

    const themeName = `reader-${theme}`;
    // Register (idempotent) + select the themed rule set. `register` with a
    // rules object injects the CSS into every rendered section iframe.
    rendition.themes.register(
      themeName,
      themeRules(theme, fontSettings.lineSpacing, fontSettings.margins),
    );
    rendition.themes.select(themeName);

    // Size + family via epub.js's dedicated helpers (they set the right root
    // font metrics so reflow re-paginates correctly).
    rendition.themes.fontSize(`${fontSettings.size}px`);
    rendition.themes.font(fontStackFor(fontSettings.family));
  }, [
    rendition,
    theme,
    fontSettings.size,
    fontSettings.family,
    fontSettings.lineSpacing,
    fontSettings.margins,
  ]);
}
