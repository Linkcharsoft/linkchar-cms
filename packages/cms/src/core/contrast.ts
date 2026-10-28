const HEX = /^#([\da-f]{3}|[\da-f]{6})$/i

// Text on the primary color (buttons, the active menu item) needs 4.5:1, WCAG AA for normal text.
export const MIN_TEXT_CONTRAST = 4.5

// Non-text indicators (the focus ring against the ground it sits on) need 3:1, WCAG 1.4.11.
export const MIN_UI_CONTRAST = 3

const channels = (hex: string) => {
  const match = HEX.exec(hex.trim())
  if (!match) throw new Error(`[@linkcharsoft/cms] "${hex}" is not a hex color like #1f5fa8 or #fff.`)
  const digits = match[1].length === 3 ? [...match[1]].map(digit => digit + digit).join('') : match[1]
  return [0, 2, 4].map(start => parseInt(digits.slice(start, start + 2), 16) / 255)
}

const linear = (value: number) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)

const gamma = (value: number) => (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055)

// WCAG 2 relative luminance of an sRGB color.
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map(linear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Contrast between two hex colors, from 1 (same) to 21 (black on white), in either order.
export const contrastRatio = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

const toOklab = (hex: string) => {
  const [r, g, b] = channels(hex).map(linear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ]
}

const fromOklab = ([L, a, b]: number[]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ]
  return `#${rgb.map(value => Math.round(Math.min(1, Math.max(0, gamma(value))) * 255).toString(16).padStart(2, '0')).join('')}`
}

// The hex `color-mix(in oklab, a <weight>%, b)` resolves to, so a test can measure a derived token.
export const mixOklab = (a: string, b: string, weight: number) => {
  const [first, second] = [toOklab(a), toOklab(b)]
  const ratio = weight / 100
  return fromOklab(first.map((value, index) => value * ratio + second[index] * (1 - ratio)))
}
