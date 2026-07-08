import { useEffect, useRef } from "react";
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

export function themeRules(theme: Theme, lineSpacing: number, margins: number) {
  const c = THEME_COLORS[theme];
  return {
    // iOS Safari auto-inflates text sized against a block's width. epub.js lays
    // every page out as columns inside ONE very wide iframe (thousands of px),
    // so iOS massively inflates the font → lines overflow the visible column
    // and get clipped on the right (only on real iPhones, not desktop/WebKit).
    // Pin text-size-adjust to 100% on the root to disable that inflation.
    "html, body": {
      "-webkit-text-size-adjust": "100% !important",
      "text-size-adjust": "100% !important",
    },
    body: {
      background: `${c.bg} !important`,
      color: `${c.fg} !important`,
      "line-height": `${lineSpacing} !important`,
      "padding-left": `${margins}px !important`,
      "padding-right": `${margins}px !important`,
      // Quiet-paper typesetting: let the browser hyphenate long lines instead
      // of leaving gappy rag/justification holes. Publisher CSS still wins on
      // alignment; we only enable the capability.
      "-webkit-hyphens": "auto",
      hyphens: "auto",
    },
    // Force text colour through common elements EPUBs style directly, so their
    // own stylesheets don't override the theme (esp. for dark).
    "p, div, span, h1, h2, h3, h4, h5, h6, li, blockquote, td, th": {
      color: `${c.fg} !important`,
    },
    a: { color: `${c.link} !important` },
    // Covers and full-page illustrations: fit the viewport column and sit
    // centered instead of rendering at natural size in the top-left.
    img: {
      "max-width": "100% !important",
      "max-height": "94vh !important",
      height: "auto",
      "object-fit": "contain",
      display: "block",
      "margin-left": "auto",
      "margin-right": "auto",
    },
    svg: {
      "max-width": "100% !important",
      "max-height": "94vh !important",
    },
  };
}

export function useEpubTheme(rendition: Rendition | null) {
  const theme = useReaderStore((s) => s.theme);
  const fontSettings = useReaderStore((s) => s.fontSettings);
  // Tracks which rendition has had its initial settings applied, so the
  // re-render nudge below only runs for *changes*, not the first application.
  const appliedRef = useRef<Rendition | null>(null);

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

    // Chromium keeps a stale raster of LARGE section iframes after styles are
    // injected from the parent — the DOM updates but the screen doesn't
    // (small sections repaint fine; wide column strips don't). Re-render the
    // current section so changed settings actually paint. Debounced so slider
    // drags don't thrash; skipped on first application (fresh iframes bake
    // the theme in at load).
    if (appliedRef.current !== rendition) {
      appliedRef.current = rendition;
      return;
    }
    const nudge = setTimeout(() => {
      try {
        const loc = rendition.currentLocation() as unknown as {
          start?: { cfi?: string };
        };
        const cfi = loc?.start?.cfi;
        if (cfi) {
          (rendition as unknown as { clear(): void }).clear();
          void rendition.display(cfi);
        }
      } catch {
        /* repaint nudge is best-effort */
      }
    }, 180);
    return () => clearTimeout(nudge);
  }, [
    rendition,
    theme,
    fontSettings.size,
    fontSettings.family,
    fontSettings.lineSpacing,
    fontSettings.margins,
  ]);
}
