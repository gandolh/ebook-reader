import { pdfjs } from "react-pdf";
// Vite worker wiring (common footgun): import the bundled pdf.js worker as a
// URL asset with `?url` and hand it to PDF.js. This uses the EXACT worker that
// ships with the installed `pdfjs-dist` (pinned 5.4.296 — must match the copy
// react-pdf depends on), so the worker/main API versions can never drift. No
// CDN, no `import.meta.url` guessing, no copying files to `public/`. Vite
// fingerprints and serves the asset in dev and bundles it for `vite build`.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export { pdfjs };
