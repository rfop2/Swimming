// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig( {
  devtools: { enabled: true },
  modules: [ "@nuxtjs/tailwindcss", "@nuxt/eslint" ],
  /* eslint: {
    config: {
      stylistic: {
        indent: 2,
        // Allow hanging commas in lists
        commaDangle: 'only-multiline',
        // Permit comments to have - or * directly after the opening character
        // spacedComment: ['error', 'always', { block: { exceptions: ['-', '*'] } }],
        // Force spaces in brackets
        // spaceInParens: ['error', 'always'],
        // spaceInfixOps: 'error',
        // spaceUnaryOps: 'error',
        // spaceBeforeBlocks: ['error', 'always'],
        // Disable requiring space before function brackets
        // spaceBeforeFunctionParen: 'off',
        // Force spaces in array definitions, other than empty ones
        // arrayBracketSpacing: ['error', 'always'],
        // Use double quotes everywhere unless for quoting purposes
        quotes: 'double',
        // Allow quoted properties as long as all in an object are the same
        quoteProps: 'consistent',
        // Limit line length
        // max-len: [ "error", { "code": 132 } ],
        // Remove semi-colons if unnecessary
        semi: false,
      },
    },
  }, */
} )