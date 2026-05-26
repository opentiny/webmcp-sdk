import * as esbuild from 'esbuild'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(__dirname, '..')
const outDir = join(pkgRoot, 'dist')

mkdirSync(outDir, { recursive: true })

const result = await esbuild.build({
  entryPoints: [join(pkgRoot, 'src/inject/page-init.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome100'],
  outfile: join(outDir, 'inject-bundle.js'),
  write: true,
  minify: false,
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
