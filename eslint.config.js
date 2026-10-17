import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["build", "coverage", "dist", "node_modules", ".superpowers", "**/.astro/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["site/scripts/**/*.mjs"],
    languageOptions: {
      globals: { URL: "readonly", process: "readonly", console: "readonly" },
    },
  },
);
