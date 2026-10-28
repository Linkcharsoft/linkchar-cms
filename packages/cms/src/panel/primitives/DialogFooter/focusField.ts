// A dialog's first field gets the focus once the dialog is shown; PrimeReact would focus the close button.
export const focusField = (id: string) => document.getElementById(id)?.focus()
