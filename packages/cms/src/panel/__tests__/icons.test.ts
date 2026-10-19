import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = fileURLToPath(new URL('../..', import.meta.url))
const PRIMEICONS = readFileSync(createRequire(import.meta.url).resolve('primeicons/primeicons.css'), 'utf8')

const sources = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  if (entry.name === '__tests__') return []
  const path = join(dir, entry.name)
  if (entry.isDirectory()) return sources(path)
  return /\.tsx?$/.test(entry.name) ? [path] : []
})

const exists = (name: string) => new RegExp(`\\.${name}(?![\\w-])`).test(PRIMEICONS)

// A class missing from the installed PrimeIcons renders an empty button, with no error anywhere.
describe('panel icons', () => {
  it('only uses icons the installed PrimeIcons has', () => {
    const missing = sources(SRC).flatMap(file => [...readFileSync(file, 'utf8').matchAll(/\bpi-[a-z0-9]+(?:-[a-z0-9]+)*/g)]
      .map(([name]) => name)
      .filter(name => !exists(name))
      .map(name => `${relative(SRC, file)}  ${name}`))
    expect(missing).toEqual([])
  })
})
