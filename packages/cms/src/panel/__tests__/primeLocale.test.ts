import { localeOption } from 'primereact/api'
import { describe, expect, it } from 'vitest'
import { primeLocale } from '../theme/primeLocale'

// Read as PrimeReact's components do: by key, from the global the provider only sets in an effect.
const option = (key: string) => (localeOption as unknown as (key: string) => string)(key)

describe('primeLocale', () => {
  it('applies the panel language before the first render, so hydration sees the same labels as the server', () => {
    expect(primeLocale('es-AR')).toBe('es')
    expect(option('clear')).toBe('Limpiar')
    expect(primeLocale('fr')).toBe('en')
    expect(option('clear')).toBe('Clear')
  })
})
