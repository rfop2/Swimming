import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import stylistic from "@stylistic/eslint-plugin"

export default [
  {
    "languageOptions": {
      globals: globals.node
    },
    "plugins": {
      "@stylistic": stylistic
    },
    "rules": {
      "@stylistic/indent": "off",
      // Allow hanging commas in lists
      "@stylistic/comma-dangle": [ "error", "only-multiline" ],
      // Permit comments to have - or * directly after the opening character
      "@stylistic/spaced-comment": [ "error", "always", { block: { exceptions: [ "-", "*" ] } } ],
      // Turn off the space in brackets rule
      // 'space-in-parens': 'off',
      // Force spaces in brackets
      "@stylistic/space-in-parens": [ "error", "always" ],
      "@stylistic/space-infix-ops": "error",
      "@stylistic/space-unary-ops": "error",
      "@stylistic/space-before-blocks": [ "error", "always" ],
      // Disable requiring space before function brackets
      "@stylistic/space-before-function-paren": "off",
      // Force spaces in array definitions, other than empty ones
      "@stylistic/array-bracket-spacing": [ "error", "always" ],
      // Use double quotes everywhere unless for quoting purposes
      "@stylistic/quotes": [ "error", "double", { avoidEscape: true } ],
      // Allow quoted properties as long as all in an object are the same
      "@stylistic/quote-props": [ "error", "consistent" ],
      // Limit line length
      // "@stylistic/max-len": [ "error", { "code": 132 } ],
      // Remove semi-colons if unnecessary
      "@stylistic/semi": [ "error", "never" ],
      "no-console": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn", // or error
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
]
