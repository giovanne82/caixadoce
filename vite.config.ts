import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("lucide-react")) return "lucide-vendor";
            if (id.includes("@tanstack")) return "tanstack-vendor";
            if (id.includes("@supabase") || id.includes("supabase-js")) return "supabase-vendor";
            return "vendor";
          }
        },
      },
    },
  },
});
