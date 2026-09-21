import { defineConfig } from 'tsup'

export default defineConfig([
  // index.ts：库入口，需要生成类型声明
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
  },
  // bin.ts：纯 CLI 入口，不需要类型声明，避免 tsc worker OOM
  {
    entry: ['src/bin.ts'],
    format: ['cjs', 'esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
  },
])
