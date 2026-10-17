import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["build", "coverage", "dist", "node_modules", ".superpowers"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
