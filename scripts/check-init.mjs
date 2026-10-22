// Runs `linkchar-cms init` in a throwaway project inside the playground (so the package, next and react resolve
// as in a real project) and type-checks what it wrote. `--keep` leaves the project there to look at.
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const playground = join(repo, 'apps', 'playground')
const project = join(playground, '.init-check')
const keep = process.argv.includes('--keep')

rmSync(project, { recursive: true, force: true })
mkdirSync(join(project, 'supabase'), { recursive: true })
writeFileSync(join(project, 'supabase', 'config.toml'), '[auth]\nsite_url = "http://127.0.0.1:3000"\n')
writeFileSync(join(project, 'tsconfig.json'), `${JSON.stringify({
  extends: '../tsconfig.json',
  compilerOptions: { noEmit: true },
  include: ['../next-env.d.ts', '**/*.ts', '**/*.tsx'],
  exclude: []
}, null, 2)}\n`)

const run = (command, args) => execFileSync(command, args, { cwd: project, stdio: 'inherit' })

try {
  run(process.execPath, [join(repo, 'packages', 'cms', 'cli', 'linkchar-cms.js'), 'init', '--name', 'Acme', '--base-path', '/cms', '--locales', 'es,en', '--src', 'src'])
  run(process.execPath, [createRequire(join(playground, 'package.json')).resolve('typescript/bin/tsc'), '-p', 'tsconfig.json'])
  console.log('\ninit: the starter project type-checks')
} finally {
  if (!keep) rmSync(project, { recursive: true, force: true })
}
