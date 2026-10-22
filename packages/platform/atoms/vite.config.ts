import path, { resolve } from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ""); // .env inside of packages/platform/atoms
  const webAppUrl = env.NEXT_PUBLIC_WEBAPP_URL ?? "";
  const schedulingVersion = env.NEXT_PUBLIC_SCHEDULING_VERSION ?? "";
  const hostingCommitSha = env.NEXT_PUBLIC_HOSTING_GIT_COMMIT_SHA ?? "";

  return {
    optimizeDeps: {
      include: [
        "@scheduling/lib",
        "@scheduling/features",
        "@scheduling/prisma",
        "@scheduling/dayjs",
        "@scheduling/platform-constants",
        "@scheduling/platform-types",
        "@scheduling/platform-utils",
      ],
    },
    plugins: [
      react(),
      dts({

        beforeWriteFile: (filePath, content) => {
          // Check if the content includes the broken path from kysely
          if (content.includes(`kysely/types.ts').$Enums`)) {
            // Replace the broken path with the correct import
            return {
              filePath,
              content: content.replaceAll(`kysely/types.ts').$Enums`, `kysely/types.ts')`),
            };
          }
          return { filePath, content };
        },
      }),
    ],
    define: {
      "process.env.NEXT_PUBLIC_WEBAPP_URL": `"${webAppUrl}"`,
      "process.env.NEXT_PUBLIC_SCHEDULING_VERSION": `"${schedulingVersion}"`,
      "process.env.NEXT_PUBLIC_HOSTING_GIT_COMMIT_SHA": `"${hostingCommitSha}"`,
      "process.env.NODE_ENV": `"${mode}"`,
      "process.env.__NEXT_ROUTER_BASEPATH": `""`,
      "process.env.__NEXT_I18N_SUPPORT": `false`,
      "process.env.__NEXT_MANUAL_TRAILING_SLASH": `false`,
      "process.env.__NEXT_TRAILING_SLASH": `false`,
      "process.env": "{}",
    },
    ssr: {
      noExternal: ["turndown"], // Example if you want to disable SSR for your library
    },
    build: {
      lib: {
        entry: [resolve(__dirname, "index.ts")],
        name: "CalAtoms",
        fileName: "cal-atoms",
        formats: ["es"],
      },
      rollupOptions: {
        external: [
          "react",
          "fs",
          "path",
          "os",
          "react/jsx-runtime",
          "react-dom",
          "react-dom/client",
          "@prisma/client",
          "react/jsx-dev-runtime",
        ],
        output: {
          format: "esm",
          globals: {
            react: "React",
            "react-dom": "ReactDOM",
            "react/jsx-runtime": "ReactJsxRuntime",
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@scheduling/lib/markdownToSafeHTML": path.resolve(__dirname, "./lib/markdownToSafeHTML"),
        "@scheduling/lib/hooks/useLocale": path.resolve(__dirname, "./lib/useLocale"),
        "@radix-ui/react-tooltip": path.resolve(__dirname, "./src/components/ui/tooltip.tsx"),
        "@radix-ui/react-dialog": path.resolve(__dirname, "./src/components/ui/dialog.tsx"),
        "@scheduling/prisma/client/runtime/library": resolve("./prisma-types/index.ts"),
        "@scheduling/prisma/client": path.resolve(__dirname, "../../kysely/types.ts"),
        kysely: path.resolve(__dirname, "./kysely-types/index.ts"),
        "@scheduling/dayjs": path.resolve(__dirname, "../../dayjs"),
        "@scheduling/platform-constants": path.resolve(__dirname, "../constants/index.ts"),
        "@scheduling/platform-types": path.resolve(__dirname, "../types/index.ts"),
        "@scheduling/platform-utils": path.resolve(__dirname, "../constants/index.ts"),
      },
    },
  };
});
