import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

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
    include: ['{cli,src}/**/__tests__/**/*.test.{ts,tsx}'],
    typecheck: { enabled: true, include: ['{cli,src}/**/__tests__/**/*.test.ts'] }
  }
})
