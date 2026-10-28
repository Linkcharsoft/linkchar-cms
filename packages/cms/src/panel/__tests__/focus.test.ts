import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const PANEL = fileURLToPath(new URL('..', import.meta.url))

const sources = (dir: string, extensions: RegExp): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  if (entry.name === '__tests__') return []
  const path = join(dir, entry.name)
  if (entry.isDirectory()) return sources(path, extensions)
  return extensions.test(entry.name) ? [path] : []
})

// Where the ring and outline utilities are spelled out once, for everything else to reuse.
const DEFINITIONS = ['theme/mixins.sass', 'theme/pt/shared.ts']

// Passthroughs whose focus can't be a plain ring: the hidden input of a control, the inset ring of a tab.
const PASSTHROUGH_EXCEPTIONS = ['theme/pt/checkbox.ts', 'theme/pt/inputswitch.ts', 'theme/pt/tabpanel.ts']

const offenders = (extensions: RegExp, check: RegExp, allowed: string[]) => sources(PANEL, extensions)
  .filter(file => !allowed.includes(relative(PANEL, file).replaceAll('\\', '/')))
  .flatMap(file => readFileSync(file, 'utf8').split('\n')
    .map((line, index) => ({ line: line.trim(), at: `${relative(PANEL, file)}:${index + 1}` }))
    .filter(({ line }) => check.test(line))
    .map(({ at, line }) => `${at}  ${line}`))

// One focus convention: the mixins in Sass, the FOCUS_* constants in passthroughs and components.
describe('focus styles', () => {
  it('come from the focus mixins in every stylesheet', () => {
    expect(offenders(/\.sass$/, /focus-visible:|focus:outline|outline-cms-/, DEFINITIONS)).toEqual([])
  })

  it('come from the shared constants in every passthrough and component', () => {
    expect(offenders(/\.tsx?$/, /focus-visible:(ring|outline)|focus:(ring|outline)/, [...DEFINITIONS, ...PASSTHROUGH_EXCEPTIONS])).toEqual([])
  })
})
