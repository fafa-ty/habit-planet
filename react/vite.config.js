import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages: 仓库名作为 base path，本地开发用 /
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === "true" ? "/habit-planet/" : "/",
  build: {
    outDir: "dist",
  },
});
