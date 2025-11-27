// eslint.config.mjs
// @ts-check

import withNuxt from "./.nuxt/eslint.config.mjs"

export default withNuxt( [
  {
    rules: {
      // -------------------------
      // Vue rules
      // -------------------------
      "vue/script-indent": [ "error", 2, { baseIndent: 1, switchCase: 1 } ],
      "vue/multi-word-component-names": "off",

      // -------------------------
      // Core stylistic rules
      // -------------------------
      "indent": "off", // Handoff to vue/script-indent + TS config
      "brace-style": [ "error", "1tbs" ],
      "comma-dangle": [ "error", "only-multiline" ],
      "quotes": [ "error", "double", { avoidEscape: true } ],
      "quote-props": [ "error", "consistent" ],
      "semi": [ "error", "never" ],

      "space-before-function-paren": "off",
      "space-before-blocks": [ "error", "always" ],
      "space-in-parens": [ "error", "always" ],
      "space-infix-ops": "error",
      "space-unary-ops": "error",
      "spaced-comment": [
        "error",
        "always",
        { block: { exceptions: [ "-", "*" ] } },
      ],
      "array-bracket-spacing": [ "error", "always" ],
      "operator-linebreak": [
        "error",
        "after",
        {
          overrides: {
            "?": "before",
            ":": "before",
            "||": "before",
          },
        },
      ],
      "arrow-parens": "off",

      // -------------------------
      // TS rules
      // -------------------------
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
    },
  },

  // TS-only overrides (applies indentation cleanly in TS files)
  {
    files: [ "**/*.ts" ],
    rules: {
      indent: [ "error", 2 ],
    },
  },
] )
