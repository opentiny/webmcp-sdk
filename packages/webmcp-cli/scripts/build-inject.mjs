import * as esbuild from 'esbuild'
import { mkdirSync, readdirSync, statSync } from 'fs'
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

// ─── 构建 inject-bundle.js（WebMCP polyfill + 基础工具注册）───
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

// ─── 构建 webmcp-tools/{hostname}.js（按域名分包的工具 bundle）───
const toolsDir = join(pkgRoot, 'webmcp-tools')
const toolsOutDir = join(outDir, 'webmcp-tools')

mkdirSync(toolsOutDir, { recursive: true })

// 扫描 webmcp-tools/ 下的所有域名目录
let domainDirs = []
try {
  domainDirs = readdirSync(toolsDir).filter(name => {
    const fullPath = join(toolsDir, name)
    return statSync(fullPath).isDirectory()
  })
} catch (e) {
  console.warn('[webmcp-cli] webmcp-tools/ 目录不存在或无法读取，跳过工具构建。')
}

if (domainDirs.length > 0) {
  const toolEntries = domainDirs
    .filter(domain => {
      // 只处理有 index.ts 的域名目录
      const entryFile = join(toolsDir, domain, 'index.ts')
      try {
        statSync(entryFile)
        return true
      } catch {
        return false
      }
    })
    .map(domain => ({
      in: join(toolsDir, domain, 'index.ts'),
      out: domain  // esbuild 会自动拼上 outdir 和 .js 后缀
    }))

  if (toolEntries.length > 0) {
    const toolsResult = await esbuild.build({
      entryPoints: toolEntries,
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: ['chrome100'],
      outdir: toolsOutDir,
      write: true,
      minify: false,
      plugins: [queryLoaderPlugin],
      // 每个工具 bundle 都用 IIFE 包裹，防止变量污染页面全局作用域
      banner: {
        js: ';(function(){'
      },
      footer: {
        js: '})();'
      }
    })

    if (toolsResult.errors.length) {
      console.error('[webmcp-cli] 工具 bundle 构建失败')
      process.exit(1)
    }

    console.log(`[webmcp-cli] webmcp-tools bundles built: ${toolEntries.map(e => e.out).join(', ')}`)
  }
}
