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
  /**
   * Whether the EPUB contents sidebar is docked open. Unlike reading position
   * (D9: intentionally not persisted), this is a durable UI *preference* — the
   * user asked for it to be remembered — so it's mirrored to localStorage.
   */
  tocSidebarOpen: boolean;
  /** The in-memory file handed from the library (`/`) to the reader (`/read`). */
  loadedFile: File | null;
  loadedFormat: Format | null;
  /**
   * The library book id backing `loadedFile`, when opened from the library
   * (D24). Lets the reader PATCH reading progress back to the server. `null`
   * for dev-sample loads (which have no library row).
   */
  loadedBookId: string | null;
  /**
   * Coarse reading progress, 0..1, reported by whichever reader is mounted
   * (PDF = page/total; EPUB = locations percentage). Consumed by the library
   * progress-sync hook to PATCH the server (D24). `null` before it's known.
   */
  progressFraction: number | null;

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
  /** Toggle the docked contents sidebar (persisted). */
  toggleTocSidebar: () => void;
  /** Stash the picked file + its detected format for `/read` to pick up. */
  setLoadedFile: (file: File | null, format: Format | null) => void;
  /** Like `setLoadedFile`, but also records the library book id (D24). */
  setLoadedBook: (file: File, format: Format, bookId: string) => void;
  /** Report coarse reading progress (0..1) from the active reader. */
  setProgressFraction: (fraction: number | null) => void;
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

// The contents-sidebar preference is the one bit of durable UI state (the user
// asked for it to be remembered). Persist just this boolean — reading position
// stays session-only (D9). Guarded so SSR/no-storage environments no-op.
const TOC_SIDEBAR_KEY = "ebook-reader:toc-sidebar-open";

function readTocSidebarPref(): boolean {
  try {
    return localStorage.getItem(TOC_SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

function writeTocSidebarPref(open: boolean) {
  try {
    localStorage.setItem(TOC_SIDEBAR_KEY, open ? "1" : "0");
  } catch {
    /* preference persistence is best-effort */
  }
}

const initialState = {
  theme: "light" as Theme,
  fontSettings: DEFAULT_FONT_SETTINGS,
  currentLocation: null as ReaderLocation,
  chromeVisible: true,
  chromeHoldCount: 0,
  layoutMode: "paginated" as LayoutMode,
  tocSidebarOpen: readTocSidebarPref(),
  loadedFile: null as File | null,
  loadedFormat: null as Format | null,
  loadedBookId: null as string | null,
  progressFraction: null as number | null,
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
  toggleTocSidebar: () =>
    set((state) => {
      const tocSidebarOpen = !state.tocSidebarOpen;
      writeTocSidebarPref(tocSidebarOpen);
      return { tocSidebarOpen };
    }),
  setLoadedFile: (loadedFile, loadedFormat) =>
    set({ loadedFile, loadedFormat, loadedBookId: null }),
  setLoadedBook: (loadedFile, loadedFormat, loadedBookId) =>
    set({ loadedFile, loadedFormat, loadedBookId, progressFraction: null }),
  setProgressFraction: (progressFraction) => set({ progressFraction }),
  setZoom: (zoom) => set({ zoom }),
  reset: () => set(initialState),
}));
