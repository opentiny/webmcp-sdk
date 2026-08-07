import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as devEntry from '../dev'

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('dev 入口契约', () => {
  it('主入口 index.ts 不再导出 Inspect Assist（dom-inspect）', () => {
    const indexSrc = readFileSync(join(pkgRoot, 'index.ts'), 'utf8')
    expect(indexSrc).not.toMatch(/from ['"]\.\/dom-inspect['"]/)
    expect(indexSrc).not.toContain('enableInspectAssist')
  })

  it('dev.ts 导出本地开发相关的 Inspect Assist API', () => {
    expect(typeof devEntry.enableInspectAssist).toBe('function')
    expect(typeof devEntry.disableInspectAssist).toBe('function')
    expect(typeof devEntry.buildElementMeta).toBe('function')
    expect(typeof devEntry.formatElementMetaText).toBe('function')
    expect(typeof devEntry.truncateHtml).toBe('function')
    expect(typeof devEntry.buildDomPath).toBe('function')
  })

  it('package.json exports 与 Vite 构建入口包含 ./dev', () => {
    const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8')) as {
      exports: Record<string, unknown>
      publishConfig: { exports: Record<string, unknown> }
    }
    expect(pkg.exports).toHaveProperty('./dev')
    expect(pkg.publishConfig.exports).toHaveProperty('./dev')

    const viteSrc = readFileSync(join(pkgRoot, 'vite.config.ts'), 'utf8')
    expect(viteSrc).toMatch(/dev:\s*['"]dev\.ts['"]/)
  })
})
