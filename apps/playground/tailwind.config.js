import cmsPreset from '@linkcharsoft/cms/tailwind'

/** @type {import('tailwindcss').Config} */
const tailwindConfig = {
  presets: [cmsPreset],
  content: ['./src/**/*.{ts,tsx}']
}

export default tailwindConfig
