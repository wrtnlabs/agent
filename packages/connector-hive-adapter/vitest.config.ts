import { defineConfig } from "vitest/config";

import { name } from "./package.json";

export default defineConfig({
  test: {
    name,
    coverage: {
      provider: "v8",
      include: ["src/**/*"],
      reporter: ["text", "lcov"],
    },
  },
});
