const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

type FocusedType = { matches: (selector: string) => boolean, closest: (selector: string) => unknown } | null

// A guide must not open over a field someone is typing in: driver.js takes the focus, and the keystrokes with it.
export const isEditing = (active: FocusedType) => !!active && (active.matches(EDITABLE) || !!active.closest('[data-tour="form"]'))
