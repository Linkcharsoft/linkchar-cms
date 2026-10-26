// Checks the tarball `pnpm pack` built for @linkcharsoft/cms: every entry point ships, no tests do.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [tarball] = process.argv.slice(2)
if (!tarball) {
  console.error('Usage: node scripts/check-pack.mjs <package.tgz>')
  process.exit(2)
}

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(repo, 'packages', 'cms')
const temp = mkdtempSync(join(tmpdir(), 'cms-pack-'))
execFileSync('tar', ['-xzf', basename(tarball), '-C', temp, ...(process.platform === 'win32' ? ['--force-local'] : [])], { cwd: dirname(resolve(tarball)) })
const root = join(temp, 'package')

const problems = []
const expectFile = (path, why) => {
  if (!existsSync(join(root, path)) || !statSync(join(root, path)).isFile()) problems.push(`${path} is missing (${why})`)
}

const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const targets = value => (typeof value === 'string' ? [value] : Object.values(value ?? {}).flatMap(targets))
for (const [entry, value] of Object.entries(manifest.exports)) {
  if (entry === './package.json') continue
  for (const target of targets(value)) {
    if (target.includes('*')) {
      const folder = join(root, dirname(target))
      if (!existsSync(folder) || readdirSync(folder).length === 0) problems.push(`${target} matches nothing (exports ${entry})`)
    } else {
      expectFile(target, `exports ${entry}`)
    }
  }
}
for (const target of Object.values(manifest.bin)) expectFile(target, 'bin')
for (const file of ['README.md', 'CHANGELOG.md', 'next/index.d.ts', 'tailwind/preset.js', 'tailwind/panel.config.js']) expectFile(file, 'files')

const sameSqlFiles = folder => {
  const shipped = existsSync(join(root, folder)) ? readdirSync(join(root, folder)).filter(file => file.endsWith('.sql')).sort() : []
  const expected = readdirSync(join(source, folder)).filter(file => file.endsWith('.sql')).sort()
  if (shipped.join() !== expected.join()) problems.push(`${folder} ships [${shipped}] but the repo has [${expected}]`)
}
sameSqlFiles('supabase/migrations')
sameSqlFiles('supabase/tests')

const walk = folder => readdirSync(folder, { withFileTypes: true }).flatMap(entry =>
  (entry.isDirectory() ? walk(join(folder, entry.name)) : [relative(root, join(folder, entry.name)).replaceAll('\\', '/')]))
for (const file of walk(root)) {
  if (/(^|\/)(__tests__|__integration__)\//.test(file) || /\.test\.tsx?$/.test(file)) problems.push(`${file} is a test file`)
}

if (problems.length > 0) {
  console.error(`check-pack: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`)
  process.exitCode = 1
} else {
  console.log(`check-pack: ${walk(root).length} files, every entry point present, no tests shipped`)
}
