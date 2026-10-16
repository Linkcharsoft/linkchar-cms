import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const PANEL = fileURLToPath(new URL('..', import.meta.url))

const sources = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  if (entry.name === '__tests__') return []
  const path = join(dir, entry.name)
  if (entry.isDirectory()) return sources(path)
  return /\.tsx?$/.test(entry.name) ? [path] : []
})

const ACCENTS = /[áéíóúñü¿¡]/i
// A JSX text node with words in it, inline (`>Guardar</`) or alone on its line between tags.
const JSX_TEXT = />\s*[A-Za-z][^<>{}]*[A-Za-z][^<>{}]*<\/|^[A-Z][\w ,.:;!?'"…-]*$/
// Props a person reads, set to a literal: aria-label='Cerrar', placeholder="Buscar".
const TEXT_PROPS = /\b(aria-label|title|placeholder|header|label|summary|detail|acceptLabel|message)=['"][^'"]*[A-Za-z]{2}/

const offenders = (check: RegExp, onlyJsx = false) => sources(PANEL).filter(file => !onlyJsx || file.endsWith('.tsx')).flatMap(file => readFileSync(file, 'utf8').split('\n')
  .map((line, index) => ({ line: line.trim(), at: `${relative(PANEL, file)}:${index + 1}` }))
  .filter(({ line }) => !line.startsWith('//') && !line.startsWith('*') && check.test(line))
  .map(({ at, line }) => `${at}  ${line}`))

// Every text a person reads comes from the catalog, so the panel works in any language it has.
describe('panel texts', () => {
  it('has no accented literals', () => {
    expect(offenders(ACCENTS)).toEqual([])
  })

  it('has no literal JSX text', () => {
    expect(offenders(JSX_TEXT, true)).toEqual([])
  })

  it('has no literal labels, titles or placeholders', () => {
    expect(offenders(TEXT_PROPS)).toEqual([])
  })
})
