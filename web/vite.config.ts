import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/nasa-space-apps-challenge-2026-dancing-with-sars/",
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
