import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
  {
    languageOptions: {
      globals: globals.node
    },
    "rules": {
      "indent": [ "error", 2 ],
      // Allow hanging commas in lists
      "comma-dangle": [ "error", "only-multiline" ],
      // Permit comments to have - or * directly after the opening character
      "spaced-comment": [ "error", "always", { block: { exceptions: [ "-", "*" ] } } ],
      // Turn off the space in brackets rule
      // 'space-in-parens': 'off',
      // Force spaces in brackets
      "space-in-parens": [ "error", "always" ],
      // Disable requiring space before function brackets
      "space-before-function-paren": "off",
      // Force spaces in array definitions, other than empty ones
      "array-bracket-spacing": [ "error", "always" ],
      // Use double quotes everywhere unless for quoting purposes
      "quotes": [ "error", "double", { avoidEscape: true } ],
      // Allow quoted properties as long as all in an object are the same
      "quote-props": [ "error", "consistent" ],
      // Allow console messages for dev. Should remove this to ensure none are deployed to production
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
];
