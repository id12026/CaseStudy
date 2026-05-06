import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/states": "http://127.0.0.1:8000",
      "/forecast": "http://127.0.0.1:8000",
      "/historical": "http://127.0.0.1:8000",
      "/model-comparison": "http://127.0.0.1:8000"
    }
  }
});

