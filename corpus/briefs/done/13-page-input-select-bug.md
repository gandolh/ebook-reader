# Task 13 — Bug: page-jump input eats digits (typing "12" lands "2")

## Context
In the EPUB reader's "Page N / total" jump field, typing `12` ends up with the
value `2` instead of `12`. Root cause is in the SHARED control
[apps/web/src/reader/chrome/PageJumpInput.tsx](../../../apps/web/src/reader/chrome/PageJumpInput.tsx#L37-L39):

```ts
useEffect(() => {
  if (draft !== null) inputRef.current?.select();
}, [draft]);
```

The effect runs on **every** `draft` change, so after each keystroke the whole
field is re-selected; the next digit replaces the selection instead of appending.
Type `1` → selected → type `2` → replaces `1` → field shows `2`. The intent
(comment: "Select-all on focus so a typed number replaces the shown page") is
correct, but it should select **once when editing begins**, not on every change.

This is the shared input, so the PDF reader has the same latent bug. Reported by
the user (2026-07-13).

## Files you OWN
- [apps/web/src/reader/chrome/PageJumpInput.tsx](../../../apps/web/src/reader/chrome/PageJumpInput.tsx)

## Files you must NOT touch
- The `onJump` contracts in `PdfReader`/`EpubReader` — the fix is internal to the input.

## What to do
1. Select-all should fire only on the focus transition, not on each draft edit.
   Options: move `.select()` into the `onFocus` handler (after `setDraft`), or
   gate the effect so it runs only when `draft` goes `null → non-null` (track a
   ref). Ensure the caret/selection is left alone while the user types.
2. Verify the "Go" button flow still works (it commits via `onMouseDown` before
   blur) and that Enter/Escape/blur behavior is unchanged.

## Acceptance
- Typing multi-digit page numbers (`12`, `123`) in the EPUB and PDF page field
  produces the full number, not the last digit.
- Focusing the field still selects the current value so the first keystroke
  replaces it (a single typed number overwrites the shown page).
- `npm run typecheck` clean; manual check in both readers.

## Outcome (2026-07-13) — done

Shipped. Root cause: `PageJumpInput` ran `.select()` in a `[draft]` effect, re-selecting on every keystroke so the next digit replaced the field. Fixed with a `wasEditingRef` so select-all fires only on the focus (`null→string`) transition; keystrokes 2+ keep the caret. Multi-digit input ("12","123") now works in both readers; first-focus still selects. Verified clean by the logic review finder. Typecheck clean.
