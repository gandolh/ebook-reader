import { apiUrl, getAuthToken } from "../lib/api-client";

/**
 * Absolute URL for a book's original bytes, for a media element's `src` (brief
 * 23). Native `<audio>`/`<video>` elements can't send an `Authorization`
 * header, so — exactly like cover `<img>` tags (`coverUrl`) — the in-memory
 * bearer token rides along as a `?token=` query param when auth is enabled.
 *
 * The server serves this route with HTTP Range support (206 / `Accept-Ranges`),
 * so the element can seek/scrub without downloading the whole file.
 */
export function mediaFileUrl(id: string): string {
  const url = apiUrl(`/library/${id}/file`);
  const token = getAuthToken();
  if (token) {
    url.searchParams.set("token", token);
  }
  return url.toString();
}
