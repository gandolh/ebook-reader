/**
 * Base API client. Reads `VITE_API_URL` (decisions.md D14 — explicit CORS
 * base URL, no Vite proxy). Falls back to the local Fastify dev port.
 *
 * This is plumbing only: the `POST /convert` call (with TanStack Query's
 * `useMutation`) lands in brief 05. `apiFetch` is the shared low-level
 * wrapper future calls build on.
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

/**
 * Thin fetch wrapper against `API_BASE_URL`. Joins `path` onto the base and
 * throws `ApiError` on non-2xx responses.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = new URL(path, API_BASE_URL);
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new ApiError(`Request to ${path} failed: ${response.status} ${response.statusText}`, response.status);
  }

  return response;
}
