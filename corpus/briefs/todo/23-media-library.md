# Task 23 — Media library: music + video alongside books

## Context

Owner request (2026-07-16): the library should also hold **music (mp3) and
video** — upload them like books and play them in the platform. No source todo;
this brief was grilled directly.

**Grilled decisions (2026-07-16, owner-confirmed):**
- Structure: **one library, type filter** — a single shared gallery; each card
  is a book, track, or video, with a media-type filter in the library chrome.
  No separate `/music` / `/videos` routes.
- Video formats: **MP4 + WebM only** — what browsers play natively (H.264/MP4
  is the universal baseline; MKV/AVI/HEVC support is absent or patchy — see
  [MDN codec guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs),
  [caniuse HEVC](https://caniuse.com/hevc)). Reject anything else at upload
  with a clear 400. **No transcoding, no ffmpeg** — extends D12's
  "formats = what the playback path supports" philosophy.
- Video thumbnails: **typographic tiles only** — frame extraction would
  require the ffmpeg binary; owner declined the dependency. Video cards use
  the existing typographic fallback tile.
- Progress: **full D31 parity** — per-user `{progress, locator}` via the
  existing `reading_progress` table and PATCH route; card progress bar;
  resume playback at the saved position. `locator` = seconds offset (string),
  the audio/video sibling of a PDF page / EPUB CFI.

**Resolved without asking:**
- Audio v1 = **mp3 only** (the owner's words); m4a/flac are a trivial later
  widening of the same enum.
- Metadata via the [`music-metadata`](https://github.com/Borewit/music-metadata)
  npm package (pure JS, no binary): ID3 title / artist / album / track /
  genre + embedded cover art for mp3; best-effort `format.duration` for
  mp3/mp4/webm. Mapping reuses existing columns — artist→`author`,
  album→`series`, track no→`series_index`, genre→`subjects` — so
  `grouping.ts` works on media unchanged.
- `GET /library/:id/file` gains **HTTP Range support** (206, `Accept-Ranges`,
  `Content-Range`) — required for seek/scrub, and Safari refuses media whose
  source ignores ranges (probes `bytes=0-1`). See
  [serving video with range requests](https://smoores.dev/post/http_range_requests/).
  Books are unaffected (ranges are opt-in by the client).
- Players slot in beside the readers: `/read?book=<id>` branches by `kind` to
  lazy `AudioPlayer` / `VideoPlayer` built on native `<audio>`/`<video>`
  elements streaming from the file URL with `?token=` (media elements can't
  send Authorization headers — same pattern as cover `<img>`s).
- Offline downloads (brief 20) are **books-only for v1**: the offline toggle
  is hidden on media cards; SW runtime caching stays cover-only.
- Upload cap: the single `MAX_UPLOAD_MB` env stays; `.env.example` gets a
  comment noting operators should raise it for video (50 MB is small for MP4).

## Files you OWN

- `packages/shared/src/file-validation.ts` — widen formats + MIME tables; add
  the `kind` mapping (`book | audio | video`).
- `packages/shared/src/library-book.ts` — `kind` + `durationSeconds` on the
  wire contract.
- `apps/api/src/extract.ts` — audio/video metadata branch (`music-metadata`).
- `apps/api/src/db.ts` — `kind`, `duration_seconds` columns + idempotent
  migration.
- `apps/api/src/library-routes.ts` — accept new formats, content-type map,
  Range support on the file route.
- `apps/web/src/library/**` — type filter (header), per-kind `CoverCard`
  rendering; `apps/web/src/lib/library-prefs.ts` — persist the filter.
- `apps/web/src/routes/read.tsx` + new `apps/web/src/player/` —
  `AudioPlayer.tsx`, `VideoPlayer.tsx`, kind branching.

## Files you must NOT touch

- `auth.ts` / `password.ts` (the global `onRequest` guard covers everything —
  no bespoke auth), `convert-route.ts` / `calibre.ts`, the PDF/EPUB reader
  internals (`apps/web/src/reader/**` beyond what `read.tsx` branching needs).
- `offline-store.ts` / `use-progress-sync.ts` — media is excluded from
  offline v1; don't extend the blob store.
- **Coordination:** briefs 21 and 22 (both unbuilt) also edit
  `library-book.ts` + `db.ts`. Columns are disjoint (21: metadata; 22:
  provenance; 23: `kind`/`duration_seconds`) — whichever builds later rebases
  its migration on the others'.

## What to do

1. **Contract** (`packages/shared`): widen `FILE_TYPES` to
   `["pdf","epub","mp3","mp4","webm"]` with extension/MIME entries
   (`audio/mpeg`, `video/mp4`, `video/webm`; detection stays extension/MIME
   only per D13). Export `MEDIA_KINDS = ["book","audio","video"]` and
   `kindForFormat(format)`. Add to `libraryBookSchema`:
   `kind: z.enum(MEDIA_KINDS)` and `durationSeconds: z.number().nullable()`.
2. **DB** (`db.ts`): `kind TEXT NOT NULL DEFAULT 'book'`,
   `duration_seconds REAL` on `books`, via the existing `pragma table_info`
   idempotent-ALTER pattern. No backfill (existing rows are books).
3. **Extraction** (`extract.ts`): a `music-metadata` `parseBuffer` branch for
   mp3/mp4/webm returning the same `ExtractedMeta` shape + `durationSeconds`.
   mp3: title / artist→author / album→series / track→seriesIndex /
   genre→subjects / embedded picture→cover, normalized **square 400×400**
   (sharp) instead of the 2:3 book crop. mp4/webm: duration only, `cover:
   null` (grilled: no frame extraction). Best-effort like the existing
   extractors — parse failure must never fail the upload.
4. **Serving** (`library-routes.ts`): on `GET /library/:id/file`, honor
   `Range: bytes=` — 206 with `Content-Range`/`Content-Length` and
   `createReadStream({start, end})`, `Accept-Ranges: bytes` always, 416 on an
   unsatisfiable range, existing ETag/304 behavior preserved. Extend
   `CONTENT_TYPE` for the three new formats. Upload route needs no new logic
   beyond the widened `detectFileType`.
5. **Players** (`apps/web`): `read.tsx` branches on `kind` to lazy
   `AudioPlayer` / `VideoPlayer` (code-split like brief 15's readers). Both
   stream from the authenticated file URL (`?token=`), use native controls
   inside a Quiet Paper frame (title header + back home, no custom scrubber
   v1). On `loadedmetadata`, seek to the saved `locator` (seconds); on
   throttled `timeupdate` (~5s) + pause/unload, PATCH
   `{progress: currentTime/duration, locator: String(currentTime)}`. Audio
   shows the square art (or fallback tile); video is just the element.
6. **Gallery** (`apps/web/src/library`): a quiet type filter
   (All / Books / Music / Videos) in the library chrome, persisted in
   `library-prefs.ts`, applied before grouping (grouping works on media via
   the artist/album column mapping). `CoverCard` renders per-kind inside the
   unchanged 2:3 footprint: audio = square art centered on paper + a
   `mm:ss` duration caption; video = typographic tile + duration; kind badge
   replaces the format badge for media. Offline toggle hidden when
   `kind !== "book"`. Uploader accepts the new types (`UploadZone` accept
   list + copy).
7. **Verify live**: upload a real tagged mp3 (art + artist/album appear,
   groups under artist), an mp4, and a webm; play each; scrub (assert a 206
   with `Content-Range` in devtools/HAR); reload → resumes at the saved
   position; a second user gets their own position; `.mkv` upload → clean
   400; books upload/read/convert untouched; existing DB migrates cleanly on
   boot.

## Acceptance

- One gallery holds books, music, and videos; the type filter narrows it and
  persists across reloads; grouping still works (music groups by
  artist/album via the author/series mapping).
- mp3 upload yields a card with embedded cover art, artist, album, and
  duration; mp4/webm yield typographic-tile cards with duration when the
  container exposes it.
- Media plays in-app with working seek (server answers 206 with correct
  `Content-Range`; Safari's `bytes=0-1` probe succeeds), and playback
  position is per-user with card progress bar + resume (D31 parity).
- Unsupported uploads (mkv/avi/flac/…) are rejected with a clear 400 naming
  the accepted formats; the 50 MB cap message stays intelligible for video.
- Books are completely unaffected: pdf/epub upload, read, convert, offline
  download, and progress all behave as before; existing rows migrate with
  `kind='book'`.
- Media cards show no offline toggle; the offline blob store never receives
  media.
- Typecheck + build + tests clean; design.md conformance checklist passes on
  the filter chrome, media cards, and both players.
