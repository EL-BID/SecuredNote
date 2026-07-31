import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["**/*.test.tsx", "jsdom"],
      ["lib/brand-theme-css.test.ts", "jsdom"],
    ],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      include: [
        "*.{ts,tsx,mjs}",
        "lib/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "app/**/*.{ts,tsx}",
        "scripts/**/*.{ts,mjs}",
        "test/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 30,
        statements: 30,
        functions: 30,
        branches: 25,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
