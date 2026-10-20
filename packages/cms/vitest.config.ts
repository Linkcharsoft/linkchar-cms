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
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['{cli,next,src}/**/__tests__/**/*.test.ts'],
          typecheck: { enabled: true, include: ['{cli,next,src}/**/__tests__/**/*.test.ts'] }
        }
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/__tests__/**/*.test.tsx'],
          css: false,
          typecheck: { enabled: true, include: ['src/**/__tests__/**/*.test.tsx'] }
        }
      }
    ]
  }
})
