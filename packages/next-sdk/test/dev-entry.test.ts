import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as mainEntry from '../index'
import * as devEntry from '../dev'

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 从主入口迁到 @opentiny/next-sdk/dev 的运行时符号 */
const DEV_RUNTIME_SYMBOLS = [
  'enableInspectAssist',
  'disableInspectAssist',
  'buildElementMeta',
  'formatElementMetaText',
  'truncateHtml',
  'buildDomPath',
] as const

describe('dev 入口契约', () => {
  it('主入口有效导出不含已迁出的 Inspect Assist 运行时符号', () => {
    const indexSrc = readFileSync(join(pkgRoot, 'index.ts'), 'utf8')
    expect(indexSrc).not.toMatch(/from ['"]\.\/dom-inspect['"]/)

    for (const symbol of DEV_RUNTIME_SYMBOLS) {
      expect(indexSrc).not.toContain(symbol)
      expect(mainEntry).not.toHaveProperty(symbol)
      expect((mainEntry as Record<string, unknown>)[symbol]).toBeUndefined()
    }
  })

  it('dev.ts 导出本地开发相关的 Inspect Assist API', () => {
    for (const symbol of DEV_RUNTIME_SYMBOLS) {
      expect(devEntry).toHaveProperty(symbol)
      expect(typeof (devEntry as Record<string, unknown>)[symbol]).toBe('function')
    }
  })

  it('package.json exports 精确映射 ./dev 源码与发布产物', () => {
    const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8')) as {
      exports: Record<string, unknown>
      publishConfig: { exports: Record<string, unknown> }
    }

    expect(pkg.exports['./dev']).toEqual({
      import: './dev.ts',
      types: './dev.ts',
    })
    expect(pkg.publishConfig.exports['./dev']).toEqual({
      import: './dist/dev.js',
      types: './dist/dev.d.ts',
    })

    const viteSrc = readFileSync(join(pkgRoot, 'vite.config.ts'), 'utf8')
    expect(viteSrc).toMatch(/dev:\s*['"]dev\.ts['"]/)
  })
})
