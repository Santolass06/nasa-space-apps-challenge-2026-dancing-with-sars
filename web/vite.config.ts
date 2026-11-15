import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // Relative asset URLs so the same build works at the root and under the
  // GitHub Pages sub-path (/<repo>/). See .github/workflows/pages.yml.
  base: "./",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
  },
});
