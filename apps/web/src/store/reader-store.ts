import { create } from "zustand";
import type { Format } from "@ebook-reader/shared";

/**
 * In-memory reader state (decisions.md D9): resets on refresh — intended, no
 * persistence. Shared by both renderers (PDF/EPUB) behind the common Kindle-
 * style chrome (wiki/reader.md). This brief only lays out typed state +
 * setters; the readers (briefs 06/07) wire the actual behavior.
 *
 * `loadedFile`/`loadedFormat` are set by the uploader (brief 05, `/`) once a
 * PDF is picked or an EPUB fork resolves to "Read", and are the handoff seam
 * the `/read` renderers (briefs 06/07) consume — kept in Zustand rather than
 * router state so the `File` object (not serializable into a URL/search
 * param) survives the navigation to `/read`.
 */

export type Theme = "light" | "sepia" | "dark";

export type LayoutMode = "paginated" | "scroll";

export interface FontSettings {
  /** Font size in px. */
  size: number;
  family: string;
  /** Line spacing multiplier, e.g. 1.5. */
  lineSpacing: number;
  /** Horizontal margin in px. */
  margins: number;
}

/**
 * Current reading position. EPUB (epub.js) uses a CFI string; PDF (react-pdf)
 * uses a page number. `null` before a document is loaded.
 */
export type ReaderLocation = string | number | null;

export interface ReaderState {
  theme: Theme;
  fontSettings: FontSettings;
  currentLocation: ReaderLocation;
  chromeVisible: boolean;
  /**
   * While > 0 the auto-hide timer must not hide the chrome — held while the
   * pointer is over the toolbar or a chrome surface (popover/drawer/search)
   * is open, so the toolbar can't fade out from under the user.
   */
  chromeHoldCount: number;
  layoutMode: LayoutMode;
  /** The in-memory file handed from the uploader (`/`) to the reader (`/read`). */
  loadedFile: File | null;
  loadedFormat: Format | null;

  /**
   * PDF-only zoom scale (1 = 100%). Fixed-layout PDFs zoom instead of reflow;
   * the EPUB reader (brief 07) ignores this and uses `fontSettings` instead.
   * Kept here so the shared chrome can wire a zoom control format-agnostically.
   * Additive field (brief 06) — do not rename/remove.
   */
  zoom: number;

  setTheme: (theme: Theme) => void;
  setFontSettings: (fontSettings: Partial<FontSettings>) => void;
  setCurrentLocation: (location: ReaderLocation) => void;
  setChromeVisible: (visible: boolean) => void;
  toggleChrome: () => void;
  acquireChromeHold: () => void;
  releaseChromeHold: () => void;
  setLayoutMode: (mode: LayoutMode) => void;
  /** Stash the picked/forked file + its detected format for `/read` to pick up. */
  setLoadedFile: (file: File | null, format: Format | null) => void;
  /** Set the PDF zoom scale (brief 06). Clamped by the caller. */
  setZoom: (zoom: number) => void;
  reset: () => void;
}

const DEFAULT_FONT_SETTINGS: FontSettings = {
  size: 18,
  family: "serif",
  lineSpacing: 1.5,
  margins: 24,
};

const initialState = {
  theme: "light" as Theme,
  fontSettings: DEFAULT_FONT_SETTINGS,
  currentLocation: null as ReaderLocation,
  chromeVisible: true,
  chromeHoldCount: 0,
  layoutMode: "paginated" as LayoutMode,
  loadedFile: null as File | null,
  loadedFormat: null as Format | null,
  zoom: 1,
};

export const useReaderStore = create<ReaderState>((set) => ({
  ...initialState,

  setTheme: (theme) => set({ theme }),
  setFontSettings: (fontSettings) =>
    set((state) => ({
      fontSettings: { ...state.fontSettings, ...fontSettings },
    })),
  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  setChromeVisible: (chromeVisible) => set({ chromeVisible }),
  toggleChrome: () => set((state) => ({ chromeVisible: !state.chromeVisible })),
  acquireChromeHold: () =>
    set((state) => ({
      chromeHoldCount: state.chromeHoldCount + 1,
      chromeVisible: true,
    })),
  releaseChromeHold: () =>
    set((state) => ({ chromeHoldCount: Math.max(0, state.chromeHoldCount - 1) })),
  setLayoutMode: (layoutMode) => set({ layoutMode }),
  setLoadedFile: (loadedFile, loadedFormat) => set({ loadedFile, loadedFormat }),
  setZoom: (zoom) => set({ zoom }),
  reset: () => set(initialState),
}));
