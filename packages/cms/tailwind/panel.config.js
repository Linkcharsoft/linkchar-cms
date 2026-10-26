import { join } from 'node:path'
import cmsPreset, { cmsContent } from './preset.js'

// `?cms?` matches the (cms) route group: parentheses are glob syntax and escaping them breaks on Windows paths.
const PROJECT_PANEL_SOURCES = ['src/cms', 'cms', 'src/app/?cms?', 'app/?cms?']

/**
 * The panel stylesheet compiles with this config (`@config` in styles.css), so the site's CSS never carries panel classes.
 * It scans the package and the project's panel code: its inputs, client and extension screens.
 * @type {import('tailwindcss').Config}
 */
const panelConfig = {
  presets: [cmsPreset],
  content: [...cmsContent(), ...PROJECT_PANEL_SOURCES.map(dir => join(process.cwd(), dir, '**/*.{ts,tsx}'))]
}

export default panelConfig
