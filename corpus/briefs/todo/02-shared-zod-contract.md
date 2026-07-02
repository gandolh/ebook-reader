# Task 02 — Shared Zod contract

## Context
`packages/shared` is the single source of truth for the convert contract + file
validation, imported by both apps so they can't drift ([decisions.md](../../wiki/decisions.md) D11).

## Files you OWN
- `packages/shared/src/*.ts` and its `index.ts` barrel

## Files you must NOT touch
- `apps/**` (they import; they don't define the contract)

## What to do
1. **File validation schema** (used client + server):
   - Accepted MIME/extension sets for PDF and EPUB (D12/D13 — ext/MIME only, no
     magic bytes).
   - A helper to classify a file as `"pdf" | "epub" | null`.
   - Max size guard (default 50MB, but keep the limit a parameter/const the API
     can override from env).
2. **Convert request schema** — shape of the multipart payload the API expects
   (filename + mimetype constraints for EPUB-only input).
3. **Convert error schema** — the structured JSON error the API returns and the
   frontend `useMutation` renders (e.g. `{ error: string, code: 'INVALID_FILE' |
   'TOO_LARGE' | 'CONVERT_FAILED' | 'TIMEOUT' | 'CALIBRE_MISSING' }`).
4. Export inferred TS types (`z.infer`) for each.

## Acceptance
- `packages/shared` builds and typechecks.
- Both a "detect file type" function and the error schema/types are exported and
  importable.
- No runtime deps beyond `zod`.
