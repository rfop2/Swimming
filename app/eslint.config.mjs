// eslint.config.mjs
// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs"
import stylistic from "@stylistic/eslint-plugin"
import pluginVue from "eslint-plugin-vue"
// @ts-ignore
import tsParser from "@typescript-eslint/parser"

export default withNuxt( [
  // Stylistic recommended rules
  ...pluginVue.configs["flat/recommended"],
  stylistic.configs.recommended,
  {
    rules: {
      ...stylistic.configs.recommended.rules,
      "@stylistic/indent": "off",
      "vue/script-indent": [ "error", 2, { baseIndent: 1, switchCase: 1 } ],
      "@stylistic/comma-dangle": [ "error", "only-multiline" ],
      "@stylistic/spaced-comment": [
        "error",
        "always",
        { block: { exceptions: [ "-", "*" ] } },
      ],
      "@stylistic/space-in-parens": [ "error", "always" ],
      "@stylistic/space-infix-ops": "error",
      "@stylistic/space-unary-ops": "error",
      "@stylistic/space-before-blocks": [ "error", "always" ],
      "@stylistic/space-before-function-paren": "off",
      "@stylistic/array-bracket-spacing": [ "error", "always" ],
      "@stylistic/quotes": [ "error", "double", { avoidEscape: true } ],
      "@stylistic/quote-props": [ "error", "consistent" ],
      "@stylistic/semi": [ "error", "never" ],
      "vue/multi-word-component-names": "off",
      "@stylistic/brace-style": [ "error", "1tbs" ],
      "@stylistic/operator-linebreak": [ "error", "after", { "overrides": { "?": "before", ":": "before", "||": "before" } } ],
      "@stylistic/arrow-parens": "off",
    },
  },
  // TypeScript rules for all .ts files including server/api
  {
    files: [ "**/*.ts", "server/api/**/*.ts" ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
      },
    },
  rules: {
    // Stylistic rules applied to TS files
    ...stylistic.configs.recommended.rules,
    "@stylistic/indent": [ "error", 2 ],
    "@typescript-eslint/no-unused-vars": [ "error", {
      "args": "all",
      "argsIgnorePattern": "^_",
      "caughtErrors": "all",
      "caughtErrorsIgnorePattern": "^_",
      "destructuredArrayIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "ignoreRestSiblings": true
    } ],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/consistent-type-imports": [ "error", { prefer: "type-imports" } ],
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
    "@stylistic/brace-style": [ "error", "1tbs" ],
    "@stylistic/operator-linebreak": [ "error", "after", { "overrides": { "?": "before", ":": "before", "||": "before" } } ],
    "@stylistic/arrow-parens": "off",
  },
  },
] )
