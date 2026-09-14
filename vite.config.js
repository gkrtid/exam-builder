import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes the built files use relative paths, so it works
// whether you deploy to https://<user>.github.io/ or https://<user>.github.io/<repo>/
export default defineConfig({
  plugins: [react()],
  base: "./",
});
