import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Needs the playground's local Supabase running and seeded: kept out of `pnpm verify`.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@linkcharsoft\/cms\/core$/, replacement: fileURLToPath(new URL('./src/core/index.ts', import.meta.url)) },
      { find: /^@linkcharsoft\/cms\/core\/opening-hours$/, replacement: fileURLToPath(new URL('./src/core/kinds/openingHours.ts', import.meta.url)) },
      { find: /^@playground\/(.*)$/, replacement: fileURLToPath(new URL('../../apps/playground/$1', import.meta.url)) }
    ]
  },
  test: {
    environment: 'node',
    include: ['src/**/__integration__/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000
  }
})
