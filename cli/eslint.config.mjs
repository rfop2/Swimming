// @ts-check
import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import stylisticPlugin from "@stylistic/eslint-plugin"
import tsParser from "@typescript-eslint/parser"

// Put all your Stylistic rules in a single object
const stylisticRules = {
  "@stylistic/indent": [ "error", 2, { SwitchCase: 1 } ],
  "@stylistic/comma-dangle": [ "error", "only-multiline" ],
  "@stylistic/spaced-comment": [ "error", "always", { block: { exceptions: [ "-", "*" ] } } ],
  "@stylistic/space-in-parens": [ "error", "always" ],
  "@stylistic/space-infix-ops": "error",
  "@stylistic/space-unary-ops": "error",
  "@stylistic/space-before-blocks": [ "error", "always" ],
  "@stylistic/space-before-function-paren": "off",
  "@stylistic/array-bracket-spacing": [ "error", "always" ],
  "@stylistic/quotes": [ "error", "double", { avoidEscape: true } ],
  "@stylistic/quote-props": [ "error", "consistent" ],
  "@stylistic/semi": [ "error", "never" ],
}

export default [
  // Ignore build/output folders
  { ignores: [ "dist" ] },

  // Standard ESLint recommended rules
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Stylistic + JS rules for config files (.mjs/.js)
  {
    files: [ "*.mjs", "*.js" ],
    plugins: { "@stylistic": stylisticPlugin },
    rules: { ...stylisticRules },
  },

  // TypeScript + Stylistic rules for all TS files
  {
    files: [ "*.mts", "*.ts" ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json", // enables type info
        sourceType: "module",
      },
    },
    plugins: { "@stylistic": stylisticPlugin },
    rules: {
      ...stylisticRules, // spread the same Stylistic rules
      // Type-aware TS rules
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/consistent-type-imports": [ "error", { prefer: "type-imports" } ],
    },
  },
]
