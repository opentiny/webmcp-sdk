import pkg from '@opentiny/tiny-robot/package.json' with { type: 'json' }
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
        __TINY_ROBOT_VERSION__: JSON.stringify(pkg.version)
      }
    }
  }

  // Library mode configuration for building utils
  return {
    plugins: [
      vue(),
      dts({
        entryRoot: 'src/utils',
        outDir: 'dist/utils',
        include: ['src/utils/**/*'],
        exclude: ['src/utils/**/*.test.*', 'src/utils/**/*.spec.*']
      })
    ],
    build: {
      lib: {
        entry: {
          index: resolve(__dirname, 'src/utils/index.ts')
        },
        name: 'nextSdkPlaygroundUtils',
        fileName: (format) => `utils/index.${format === 'es' ? 'js' : format}`,
        formats: ['es']
      },
      rollupOptions: {
        external: (id) => {
          // Externalize all dependencies and CSS files
          return id.includes('node_modules') || id.endsWith('.css') || id === 'vue' || id === '@vue/repl'
        },
        output: {
          globals: {
            vue: 'Vue',
            '@vue/repl': 'VueRepl'
          }
        }
      },
      outDir: 'dist',
      emptyOutDir: false
    }
  }
})
