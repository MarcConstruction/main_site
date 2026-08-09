import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Vite 8's ESM config loader deprecates __dirname; use import.meta.dirname.
const here = import.meta.dirname;

// Multi-page, not an SPA: each route is a real HTML file. A builder's
// marketing site lives or dies on search, and no router means no router CVEs.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        home: resolve(here, "index.html"),
        projects: resolve(here, "projects.html"),
        project: resolve(here, "project.html"),
        about: resolve(here, "about.html"),
        contact: resolve(here, "contact.html"),
        // Internal: the owner console. Not linked from the site, noindexed in
        // the page and again in vercel.json. Its own chunk, so a visitor to
        // the marketing site never downloads a byte of it.
        console: resolve(here, "console.html")
      }
    }
  }
});
