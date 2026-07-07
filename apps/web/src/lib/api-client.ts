/**
 * Base API client. Reads `VITE_API_URL` (decisions.md D14 — explicit CORS
 * base URL, no Vite proxy). Falls back to the local Fastify dev port.
 *
 * This is plumbing only: the `POST /convert` call (with TanStack Query's
 * `useMutation`) lands in brief 05. `apiFetch` is the shared low-level
 * wrapper future calls build on.
 *
 * Auth (brief 09): this module owns the in-memory bearer token and a single
 * "unauthorized" callback, rather than importing `./auth` directly — `auth.ts`
 * imports `apiFetch` from here, so importing it back would be circular.
 * `auth.ts` calls `setAuthToken`/`setOnUnauthorized` to wire itself up.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Set (or clear, with `null`) the bearer token attached to every `apiFetch` call. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** Current in-memory token, if any (used by `coverUrl` for `<img>` tags that can't send headers). */
export function getAuthToken(): string | null {
  return authToken;
}

/** Registers the callback fired when any (non-exempt) call gets a 401 — see `skipAuthRedirect`. */
export function setOnUnauthorized(handler: () => void): void {
  onUnauthorized = handler;
}

/**
 * Thin fetch wrapper against `API_BASE_URL`. Joins `path` onto the base,
 * attaches `Authorization: Bearer <token>` when one is set, and throws
 * `ApiError` on non-2xx responses.
 *
 * `skipAuthRedirect` opts a call out of the global 401 handler — used only by
 * `POST /auth/login`, where a 401 is the expected "wrong password" signal, not
 * a stale/invalid token that should re-lock the app.
 */
export async function apiFetch(
  path: string,
  init?: RequestInit,
  options?: { skipAuthRedirect?: boolean },
): Promise<Response> {
  const url = new URL(path, API_BASE_URL);
  const headers = new Headers(init?.headers);
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    if (response.status === 401 && !options?.skipAuthRedirect) {
      onUnauthorized?.();
    }
    throw new ApiError(`Request to ${path} failed: ${response.status} ${response.statusText}`, response.status);
  }

  return response;
}
