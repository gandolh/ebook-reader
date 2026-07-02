import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  // Served under a sub-path in production (e.g. /ebook-reader/). The deploy tool
  // injects BASE_PATH at build time; defaults to "/" for local dev/preview.
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
});
