const tailwindcss = require('tailwindcss')

/**
 * Tailwind 3, run per stylesheet: it keeps a file's `@config` for every later file of the plugin, and Next shares one.
 * @param {string | import('tailwindcss').Config | { config: string | import('tailwindcss').Config }} [options]
 * @returns {import('postcss').AcceptedPlugin}
 */
const cmsTailwind = options => ({
  postcssPlugin: 'tailwindcss',
  plugins: [async (root, result) => {
    for (const plugin of tailwindcss(options).plugins) await plugin(root, result)
  }]
})
cmsTailwind.postcss = true

module.exports = cmsTailwind
