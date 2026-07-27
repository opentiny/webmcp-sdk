import { defineConfig } from 'tsup'
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function runBuildInject() {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'scripts/build-inject.mjs')], {
    cwd: __dirname,
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    console.warn('[tsup] build:inject failed; inject-bundle.js may be missing')
  }
}

export default defineConfig({
  entry: ['src/bin.ts', 'src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  // clean 会删掉整个 dist（含 inject-bundle.js）；改在 onSuccess 里重建 inject
  clean: true,
  async onSuccess() {
    runBuildInject()
  },
})
