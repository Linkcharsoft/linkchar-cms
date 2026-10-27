import cmsPreset from '@linkcharsoft/cms/tailwind'

// A site theme of its own, like linkchar-page's: the site's Sass applies these, the panel config doesn't have them.
/** @type {import('tailwindcss').Config} */
const tailwindConfig = {
  presets: [cmsPreset],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: { 'site-xs': { max: '640px' }, 'site-lg': { min: '901px' } },
      colors: { 'site-ink': '#120e1c' }
    }
  }
}

export default tailwindConfig
