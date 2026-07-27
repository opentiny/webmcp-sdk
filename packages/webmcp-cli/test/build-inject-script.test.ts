/**
 * 构建脚本契约：inject-bundle 必须在 build 脚本层面同步产出
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('webmcp-cli build scripts', () => {
  it('复现：build 仅跑 tsup 时 inject 可能尚未就绪 —— 前置读 package.json；步骤检查 scripts.build；期望含 && build:inject 串行硬保证', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf-8')) as {
      scripts: Record<string, string>
    }
    const build = pkg.scripts.build || ''
    // 不得只依赖 tsup onSuccess（失败曾仅 warn，且与后续脚本存在窗口期）
    expect(build).toMatch(/tsup/)
    expect(build).toMatch(/&&/)
    expect(build).toMatch(/build:inject/)
  })
})
