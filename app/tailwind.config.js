// tailwind.config.js
const defaultTheme = require( "tailwindcss/defaultTheme" )
const plugin = require( "tailwindcss/plugin" )

module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: [ "Inter var", ...defaultTheme.fontFamily.sans ],
      },
    },
  },
  content: [
    "./components/**/*.{vue,js,ts}",
    "./pages/**/*.{vue,js,ts}",
    "./layouts/**/*.{vue,js,ts}",
    "./app/**/*.{vue,js,ts}",
    "./plugins/**/*.{js,ts}",
  ],
  plugins: [
    require( "@tailwindcss/forms" ),
    plugin( ( { addVariant, addUtilities } ) => {
      //
      // 1) Headless UI variant
      //
      addVariant( "ui-disabled", '&[data-headlessui-state~="disabled"]' )

      //
      // 2) Fixed `.form-disabled` utility
      //    Does NOT apply disabled styles by itself
      //
      const disabledUtilities = {
        //
        // Only apply styles when BOTH:
        //   - .form-disabled is present
        //   - AND true disabled state is present
        //
        '.form-disabled[data-headlessui-state~="disabled"]': {
          "opacity": "0.6",
          "cursor": "not-allowed",
          "background-color": "rgb(243 244 246)",
          "color": "rgb(156 163 175)",
          "outline-color": "rgb(229 231 235)",
        },

        ".form-disabled:disabled": {
          "opacity": "0.6",
          "cursor": "not-allowed",
          "background-color": "rgb(243 244 246)",
          "color": "rgb(156 163 175)",
          "outline-color": "rgb(229 231 235)",
        },
      }

      addUtilities( disabledUtilities, {
        respectPrefix: true,
        respectImportant: true,
      } )
    } ),
  ],
}
