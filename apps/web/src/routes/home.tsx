import { Dialog } from "@base-ui/react/dialog";
import { Link } from "@tanstack/react-router";
import { SUPPORTED_FORMATS } from "@ebook-reader/shared";

/**
 * `/` — home / upload placeholder. The real dropzone + format detection +
 * convert flow lands in brief 05 (wiki/reader.md "Entry: smart uploader").
 *
 * The Dialog here proves Base UI wires up end-to-end (installed, styled via
 * Tailwind `data-*` variants, accessible) so the reader chrome (briefs
 * 06/07) can lean on the same primitives for the TOC drawer / settings
 * sheet / theme picker.
 */
export function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">ebook-reader</h1>
      <p className="text-reader-fg/70">
        Upload shell placeholder — the dropzone + format detection lands in brief 05.
      </p>
      <p className="text-sm text-reader-fg/60">
        Supported formats: {SUPPORTED_FORMATS.join(", ")}
      </p>

      <div className="flex gap-3">
        <Dialog.Root>
          <Dialog.Trigger className="rounded-md border border-reader-border bg-reader-surface px-4 py-2 text-sm font-medium data-[popup-open]:bg-reader-accent data-[popup-open]:text-white">
            Open Base UI dialog
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 bg-black/50" />
            <Dialog.Popup className="fixed top-1/2 left-1/2 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-reader-border bg-reader-bg p-6 text-reader-fg shadow-xl">
              <Dialog.Title className="text-lg font-semibold">Base UI is wired up</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-reader-fg/70">
                This Dialog proves @base-ui/react renders and is styled with Tailwind. The TOC
                drawer, settings sheet, and theme picker in the reader chrome will reuse these
                primitives.
              </Dialog.Description>
              <Dialog.Close className="mt-4 rounded-md bg-reader-accent px-3 py-1.5 text-sm text-white">
                Close
              </Dialog.Close>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        <Link
          to="/read"
          className="rounded-md border border-reader-border px-4 py-2 text-sm font-medium"
        >
          Go to reader shell
        </Link>
      </div>
    </main>
  );
}
