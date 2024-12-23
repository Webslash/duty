import { defineConfig } from "tsup";

export default defineConfig((env) => {
  return {
    entry: {
      index: "./src/index.ts",
      "adapters/prisma": "./src/adapters/prisma/index.ts",
    },
    format: ["esm", "cjs"],
    bundle: true,
    splitting: false,
    cjsInterop: true,
    skipNodeModulesBundle: true,
  };
});
