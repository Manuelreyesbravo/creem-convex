import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    schema: "src/schema.ts",
    "hooks/index": "src/hooks/index.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["convex", "react"],
  splitting: false,
  treeshake: true,
});
