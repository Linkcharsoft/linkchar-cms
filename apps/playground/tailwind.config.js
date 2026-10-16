import cmsPreset, { cmsContent } from '@linkcharsoft/cms/tailwind'

/** @type {import('tailwindcss').Config} */
const tailwindConfig = {
  presets: [cmsPreset],
  content: ['./src/**/*.{ts,tsx}', ...cmsContent()]
}

export default tailwindConfig
