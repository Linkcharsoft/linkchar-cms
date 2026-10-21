const SAVED_EVENT = 'cms:saved'

// The editor announces each save so the shell refreshes what depends on it without reloading the route.
export const announceSaved = () => window.dispatchEvent(new Event(SAVED_EVENT))

export const onSaved = (listener: () => void) => {
  window.addEventListener(SAVED_EVENT, listener)
  return () => window.removeEventListener(SAVED_EVENT, listener)
}
