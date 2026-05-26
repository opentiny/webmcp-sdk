import * as esbuild from 'esbuild'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(__dirname, '..')
const outDir = join(pkgRoot, 'dist')

mkdirSync(outDir, { recursive: true })

const queryLoaderPlugin = {
  name: 'query-loader',
  setup(build) {
    build.onResolve({ filter: /\?(raw|url)$/ }, args => {
      // 解析实际的文件路径
      const pathModule = require('path')
      let filePath = args.path.split('?')[0]
      if (filePath.startsWith('.')) {
        filePath = pathModule.resolve(args.resolveDir, filePath)
      } else {
        try {
          filePath = require.resolve(filePath, { paths: [args.resolveDir] })
        } catch(e) {
          return null
        }
      }
      return { path: filePath, namespace: 'query-loader', pluginData: { query: args.path.split('?')[1] } }
    })
    build.onLoad({ filter: /.*/, namespace: 'query-loader' }, args => {
      const fs = require('fs')
      const contents = fs.readFileSync(args.path)
      if (args.pluginData.query === 'raw') {
        return { contents, loader: 'text' }
      }
      if (args.pluginData.query === 'url') {
        return { contents, loader: 'dataurl' }
      }
    })
  }
}

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const result = await esbuild.build({
  entryPoints: [join(pkgRoot, 'src/inject/page-init.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome100'],
  outfile: join(outDir, 'inject-bundle.js'),
  write: true,
  minify: false,
  plugins: [queryLoaderPlugin],
  banner: {
    js: ';(function(){'
  },
  footer: {
    js: '})();'
  }
})

if (result.errors.length) {
  process.exit(1)
}

console.log('[webmcp-cli] inject-bundle.js built')
