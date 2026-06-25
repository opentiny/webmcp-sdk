import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const shouldMinify = mode !== 'dev'

  return {
    plugins: [
      dts({
        rollupTypes: true,
        outDir: 'dist',
        include: ['src']
      })
    ],
    build: {
      emptyOutDir: true,
      minify: shouldMinify,
      lib: {
        entry: './src/index.ts',
        name: 'NextWebAgent',
        formats: ['es', 'umd'],
        fileName: (format) => `index.${format}${shouldMinify ? '' : '.dev'}.js`
      }
    }
  }
})
