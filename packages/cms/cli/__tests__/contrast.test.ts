import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const cli = fileURLToPath(new URL('../linkchar-cms.js', import.meta.url))

const run = (...args: string[]) => {
  const { status, stdout, stderr } = spawnSync(process.execPath, [cli, 'contrast', ...args], { encoding: 'utf8' })
  return { status, output: `${stdout}${stderr}` }
}

describe('linkchar-cms contrast', () => {
  it('passes a primary that white text reads on and fails one it does not', () => {
    expect(run('#1f5fa8')).toEqual({ status: 0, output: '#1f5fa8 under #ffffff: 6.44:1, passes 4.5:1\n' })
    expect(run('#7db4f0').status).toBe(1)
    expect(run('#7db4f0', '--on', '#10284a').status).toBe(0)
  })

  it('explains a color that is not hex', () => {
    expect(run('blue')).toMatchObject({ status: 1, output: expect.stringContaining('"blue" is not a hex color') })
  })
})
