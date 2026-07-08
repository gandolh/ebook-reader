import { create } from "zustand";
import { authStatusSchema, loginResponseSchema, type LoginRequest } from "@ebook-reader/shared";

import { ApiError, apiFetch, setAuthToken, setOnUnauthorized } from "./api-client";

/**
 * Web-side auth gate: per-user accounts (username + password). The library is
 * shared across users. `GET /auth/status` reports whether auth is required
 * (always true now); the app stays behind `LockScreen` until `POST /auth/login`
 * returns a session token.
 *
 * The token is mirrored to localStorage so a refresh doesn't re-lock, and
 * pushed into `api-client`'s in-memory holder (`setAuthToken`) since that
 * module attaches it to every `apiFetch` call and can't import this file back
 * (see api-client.ts's header comment on the circular-import seam).
 */

const TOKEN_KEY = "ebook-reader.token";
const USERNAME_KEY = "ebook-reader.username";

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* token persistence is best-effort */
  }
}

function readStoredUsername(): string | null {
  try {
    return localStorage.getItem(USERNAME_KEY);
  } catch {
    return null;
  }
}

function writeStoredUsername(username: string | null): void {
  try {
    if (username) {
      localStorage.setItem(USERNAME_KEY, username);
    } else {
      localStorage.removeItem(USERNAME_KEY);
    }
  } catch {
    /* username persistence is best-effort */
  }
}

export type AuthGateStatus = "checking" | "locked" | "unlocked";

interface AuthState {
  status: AuthGateStatus;
  /** Username of the signed-in user, once known (from login or storage). */
  username: string | null;
  /** Inline login-form error (wrong credentials), cleared on each attempt. */
  error: string | null;
  /** Call once on app start: resolves whether the gate should show at all. */
  checkStatus: () => Promise<void>;
  /** Submit username + password; on success unlocks, on 401 sets `error`. */
  login: (username: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "checking",
  username: readStoredUsername(),
  error: null,

  async checkStatus() {
    try {
      const res = await apiFetch("/auth/status", undefined, { skipAuthRedirect: true });
      const { required } = authStatusSchema.parse(await res.json());

      if (!required) {
        set({ status: "unlocked", error: null });
        return;
      }

      const token = readStoredToken();
      if (token) {
        setAuthToken(token);
        set({ status: "unlocked", error: null });
      } else {
        set({ status: "locked", error: null });
      }
    } catch {
      // API unreachable or errored — don't strand the user on a lock screen
      // they can't resolve (login would fail the same way); render the app
      // and let the existing per-request error states (e.g. home.tsx's
      // "API may be offline") surface the problem instead.
      set({ status: "unlocked", error: null });
    }
  },

  async login(username, password) {
    set({ error: null });
    try {
      const res = await apiFetch(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password } satisfies LoginRequest),
        },
        { skipAuthRedirect: true },
      );
      const { token, username: resolved } = loginResponseSchema.parse(await res.json());
      writeStoredToken(token);
      writeStoredUsername(resolved);
      setAuthToken(token);
      set({ status: "unlocked", username: resolved, error: null });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        set({ error: "Incorrect username or password." });
      } else {
        set({ error: "Something went wrong. Please try again." });
      }
    }
  },
}));

// Wire the api-client's 401 callback to re-lock: any authenticated call that
// comes back 401 means the stored token is stale/invalid.
setOnUnauthorized(() => {
  writeStoredToken(null);
  writeStoredUsername(null);
  setAuthToken(null);
  useAuthStore.setState({ status: "locked", username: null, error: null });
});

// Seed api-client's in-memory token from storage immediately at module load,
// before `checkStatus` (or any other apiFetch call) runs.
setAuthToken(readStoredToken());
