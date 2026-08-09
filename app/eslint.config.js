import js from "@eslint/js";
import globals from "globals";

/* Here to catch one class of bug, not to police style.
   `LOCALITIES` survived a rename, the build compiled it happily, and the
   console went white on load with no message. Vite cannot see an undefined
   identifier; a linter can, in under a second. */

export default [
  // Build output and vendored files are not ours to lint.
  { ignores: ["dist/**", "node_modules/**", "public/**"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}", "scripts/**/*.mjs", "api/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none" }]
    }
  }
];
