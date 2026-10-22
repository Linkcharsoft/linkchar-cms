const HEX = /^#([\da-f]{3}|[\da-f]{6})$/i

// Text on the primary color (buttons, the active menu item) needs 4.5:1, WCAG AA for normal text.
export const MIN_TEXT_CONTRAST = 4.5

const channels = (hex: string) => {
  const match = HEX.exec(hex.trim())
  if (!match) throw new Error(`[@linkcharsoft/cms] "${hex}" is not a hex color like #1f5fa8 or #fff.`)
  const digits = match[1].length === 3 ? [...match[1]].map(digit => digit + digit).join('') : match[1]
  return [0, 2, 4].map(start => parseInt(digits.slice(start, start + 2), 16) / 255)
}

// WCAG 2 relative luminance of an sRGB color.
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map(value => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Contrast between two hex colors, from 1 (same) to 21 (black on white), in either order.
export const contrastRatio = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}
