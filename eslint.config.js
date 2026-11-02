import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "build",
      "coverage",
      "dist",
      "**/dist/**",
      "node_modules",
      ".superpowers",
      ".taste-skill",
      ".agents/skills/design-taste-frontend",
      "**/.astro/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["site/scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        URL: "readonly",
        fetch: "readonly",
        process: "readonly",
        console: "readonly",
      },
    },
  },
  {
    files: ["site/public/scripts/**/*.js"],
    languageOptions: {
      globals: {
        document: "readonly",
        navigator: "readonly",
        window: "readonly",
      },
    },
  },
);
