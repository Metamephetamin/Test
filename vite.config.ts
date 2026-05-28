import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4100"
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/client/test/setup.ts"]
  }
});
