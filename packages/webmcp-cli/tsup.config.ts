import { defineConfig } from 'tsup'
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * watch / clean 后重建 inject-bundle。
 * 一次性 `pnpm build` 另有 `&& pnpm run build:inject` 硬保证（失败则整次 build 失败）。
 */
function runBuildInject(): void {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'scripts/build-inject.mjs')], {
    cwd: __dirname,
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    throw new Error('[tsup] build:inject failed; inject-bundle.js may be missing')
  }
}

export default defineConfig({
  entry: ['src/bin.ts', 'src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  // 保留 inject 产物，缩短 clean→onSuccess 窗口期（watcher / readInjectBundle 不至于短暂找不到文件）
  clean: ['**/*', '!inject-bundle.js', '!webmcp-tools', '!webmcp-tools/**'],
  async onSuccess() {
    runBuildInject()
  },
})
