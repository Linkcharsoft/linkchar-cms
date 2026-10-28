'use client'
import { useRef, useState } from 'react'
import type { AutoComplete, AutoCompleteChangeEvent } from 'primereact/autocomplete'
import type { FocusEvent } from 'react'

interface Options<T> {
  fetch: (query: string) => Promise<T[]>
  // The option on screen; the picker shows it again when typed text is left behind.
  selected: T | null
  onPick: (option: T | null) => void
}

// A single-choice AutoComplete that lists options on focus, keeps what the editor types across renders,
// ignores answers that arrive out of order and never drops the chosen option on blur.
export const useSearchPicker = <T>({ fetch, selected, onPick }: Options<T>) => {
  const ref = useRef<AutoComplete>(null)
  const [suggestions, setSuggestions] = useState<T[]>([])
  const [typed, setTyped] = useState<string | null>(null)
  const requests = useRef(0)

  const search = async (query: string) => {
    const request = ++requests.current
    const results = await fetch(query)
    if (request === requests.current) setSuggestions(results)
  }

  // The label is selected so typing replaces it, and the first options show without typing.
  const onFocus = (event: FocusEvent<HTMLInputElement>) => {
    setTyped(null)
    event.target.select()
    ref.current?.search(event, '', 'dropdown')
  }

  const onChange = (event: AutoCompleteChangeEvent) => {
    const value = event.value as T | string | null
    if (typeof value === 'string') {
      setTyped(value)
      return
    }
    setTyped(null)
    onPick(value)
  }

  // Typed text that matched nothing goes away; an emptied input clears the choice.
  const onBlur = () => {
    if (typed === null) return
    setTyped(null)
    if (typed.trim() === '') onPick(null)
  }

  return {
    ref,
    suggestions,
    search,
    typed,
    value: typed ?? selected,
    onFocus,
    onChange,
    onBlur
  }
}
