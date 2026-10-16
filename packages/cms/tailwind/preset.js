import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import plugin from 'tailwindcss/plugin'

const TYPE_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40]
const TYPE_WEIGHTS = { extrabold: 800, bold: 700, semibold: 600, medium: 500, regular: 400, light: 300 }

const scale = (name, steps) => Object.fromEntries(steps.map(step => [step, `var(--cms-${name}-${step})`]))

const typography = plugin(({ addComponents }) => {
  addComponents(Object.fromEntries(
    Object.entries(TYPE_WEIGHTS).flatMap(([weight, value]) => TYPE_SIZES.map(size => [
      `.cms-text-${weight}-${size}`,
      { fontSize: `${size}px`, fontWeight: String(value) }
    ]))
  ))
})

/**
 * Panel classes the project's Tailwind must scan: presets cannot add `content`, so spread this into it.
 * @returns {string[]}
 */
export const cmsContent = () => {
  const source = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
  return [join(source, '**/*.{ts,tsx}'), `!${join(source, '**/__tests__/**')}`]
}

/** @type {import('tailwindcss').Config} */
const cmsPreset = {
  content: [],
  theme: {
    extend: {
      colors: {
        cms: {
          primary: {
            DEFAULT: 'var(--cms-primary)',
            hover: 'var(--cms-primary-hover)',
            active: 'var(--cms-primary-active)',
            ring: 'var(--cms-primary-ring)',
            contrast: 'var(--cms-on-primary)',
            ...scale('primary', [50, 100, 200])
          },
          sidebar: {
            DEFAULT: 'var(--cms-sidebar)',
            hover: 'var(--cms-sidebar-hover)',
            active: 'var(--cms-sidebar-active)',
            ink: 'var(--cms-on-sidebar)',
            muted: 'var(--cms-on-sidebar-muted)'
          },
          ink: scale('ink', [300, 400, 500, 600, 700, 800, 900]),
          neutral: scale('neutral', [50, 100, 200]),
          surface: 'var(--cms-surface)',
          border: { DEFAULT: 'var(--cms-border)', strong: 'var(--cms-border-strong)' },
          overlay: 'var(--cms-overlay)',
          veil: 'var(--cms-veil)',
          danger: scale('danger', [50, 200, 600, 700, 800]),
          warning: scale('warning', [50, 200, 500, 700, 800]),
          success: scale('success', [50, 200, 600, 700, 800])
        }
      },
      fontFamily: {
        'cms-sans': 'var(--cms-font-sans)',
        'cms-display': 'var(--cms-font-display)'
      }
    }
  },
  plugins: [typography]
}

export default cmsPreset
