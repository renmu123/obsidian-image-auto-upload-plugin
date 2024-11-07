import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    typecheck: {
      tsconfig: "tsconfig.vitest.json",
    },
    globals: true,
  },
  resolve: {
    alias: {
      "virtual:obsidian": resolve(__dirname, "src/mocks/obsidian.ts"),
    },
  },
});
