import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const shouldMinify = mode !== 'dev'

  return {
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
