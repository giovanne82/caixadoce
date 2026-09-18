import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  plugins: [
    ...(legacy({
      targets: [
        "defaults",
        "not IE 11",
        "chrome >= 64",
        "edge >= 79",
        "safari >= 12",
        "firefox >= 67",
        "samsung >= 10",
      ],
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
      renderModernChunks: true,
    }) as any[]).map((p) => ({
      ...p,
      applyToEnvironment(env: any) {
        return env.name === "client";
      },
    })),
  ],
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
    nodeVersion: "22.x",
  },
  build: {
    target: ["es2020", "edge88", "firefox78", "chrome87", "safari14"],
    cssTarget: ["chrome87", "firefox78", "safari14", "edge88"],
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("lucide-react")) return "lucide-vendor";
            if (id.includes("@tanstack")) return "tanstack-vendor";
            if (id.includes("@supabase") || id.includes("supabase-js")) return "supabase-vendor";
            return "vendor";
          }
          return undefined;
        },
      },
    },
  },
} as any);
