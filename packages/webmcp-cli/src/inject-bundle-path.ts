import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 解析 inject-bundle.js 路径。
 * tsup 打包后 __dirname 为 dist/；开发态也可能落在源码旁。
 */
export function resolveInjectBundlePath(): string {
  const candidates = [
    path.resolve(__dirname, 'inject-bundle.js'),
    path.resolve(__dirname, '../dist/inject-bundle.js'),
    path.resolve(process.cwd(), 'dist/inject-bundle.js'),
    path.resolve(process.cwd(), 'packages/webmcp-cli/dist/inject-bundle.js'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return candidates[0]
}

export function readInjectBundleOrThrow(): string {
  const injectScriptPath = resolveInjectBundlePath()
  if (!fs.existsSync(injectScriptPath)) {
    throw new Error(
      `Cannot find inject-bundle.js (tried near ${__dirname}). Please run 'pnpm build' or 'pnpm build:inject' first.`
    )
  }
  return fs.readFileSync(injectScriptPath, 'utf-8')
}
