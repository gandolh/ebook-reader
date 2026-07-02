import { create } from "zustand";

/**
 * In-memory reader state (decisions.md D9): resets on refresh — intended, no
 * persistence. Shared by both renderers (PDF/EPUB) behind the common Kindle-
 * style chrome (wiki/reader.md). This brief only lays out typed state +
 * setters; the readers (briefs 06/07) wire the actual behavior.
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
  layoutMode: LayoutMode;

  setTheme: (theme: Theme) => void;
  setFontSettings: (fontSettings: Partial<FontSettings>) => void;
  setCurrentLocation: (location: ReaderLocation) => void;
  setChromeVisible: (visible: boolean) => void;
  toggleChrome: () => void;
  setLayoutMode: (mode: LayoutMode) => void;
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
  layoutMode: "paginated" as LayoutMode,
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
  setLayoutMode: (layoutMode) => set({ layoutMode }),
  reset: () => set(initialState),
}));
