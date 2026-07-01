import pkg from '../next-sdk/package.json' with { type: 'json' }
import vue from '@vitejs/plugin-vue'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

  if (!isLib) {
    return {
      base: process.env.PLAYGROUND_BASE || '/playground',
      server: { port: 5184 },
      plugins: [vue()],
      optimizeDeps: {
        exclude: ['@vue/repl']
      },
      define: {
        __TINY_NEXT_SDK_VERSION__: JSON.stringify(pkg.version)
      }
    }
  }

  // Library mode configuration for building utils
  return {
    build: {
      lib: {
        entry: {
          index: resolve(__dirname, 'src/utils/index.ts')
        },
        name: 'nextSdkPlaygroundUtils',
        fileName: (format) => `utils/index.${format === 'es' ? 'js' : format}`,
        formats: ['es']
      },
      outDir: 'dist',
      emptyOutDir: false
    }
  }
})
