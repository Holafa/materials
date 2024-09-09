import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli/main.ts", "src/telegram-bot/main.ts"],
  format: ["esm", "cjs"],
  splitting: true,
  sourcemap: true,
  clean: true,
  skipNodeModulesBundle: true,
  dts: true,
  external: ["node_modules"],
  esbuildOptions: (options) => {
    options.external = ["fsevents"];
  }
});
