import { SUPPORTED_FORMATS, type Format } from "@ebook-reader/shared";

// Value + type import from @ebook-reader/shared proves the workspace resolves.
const formats: readonly Format[] = SUPPORTED_FORMATS;

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export function App() {
  return (
    <main>
      <h1>ebook-reader</h1>
      <p>Scaffold ready. UI lands in a later brief.</p>
      <p>API: {apiUrl}</p>
      <p>Supported formats: {formats.join(", ")}</p>
    </main>
  );
}
