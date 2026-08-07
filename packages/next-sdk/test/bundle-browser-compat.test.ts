import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import {
  isLibExternal,
  isForbiddenDistBareImport,
  LIB_EXTERNAL_PACKAGES
} from '../build/lib-external'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = path.join(pkgRoot, 'dist')

function collectJsFiles(dir: string): string[] {
  const out: string[] = []
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...collectJsFiles(full))
    else if (name.endsWith('.js')) out.push(full)
  }
  return out
}

function collectBareImports(fileText: string): string[] {
  const specs: string[] = []
  for (const line of fileText.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('import ') && !trimmed.startsWith('export ')) continue
    const fromRe = /\bfrom\s+["']([^./][^"']*)["']/g
    let m: RegExpExecArray | null
    while ((m = fromRe.exec(trimmed))) specs.push(m[1])
    const side = trimmed.match(/^import\s+["']([^./][^"']*)["']\s*;?\s*$/)
    if (side) specs.push(side[1])
  }
  return specs
}

describe('lib bundle browser compat', () => {
  it('复现：Angular 宿主解析外置 ai/@ai-sdk 时触发 Node 内置模块（http 等）——前置库构建将 ai 标为 external；步骤按新策略判定；期望 ai/@ai-sdk/MCP/@opentiny/next 不再 external，仅 zod/ajv/qrcode 外置', () => {
    // 旧行为：ai / @ai-sdk/* 被 external → Angular/Webpack5 解析间接依赖时报 Can't resolve 'http'
    expect(isLibExternal('ai')).toBe(false)
    expect(isLibExternal('@ai-sdk/openai')).toBe(false)
    expect(isLibExternal('@ai-sdk/deepseek')).toBe(false)
    expect(isLibExternal('@ai-sdk/provider')).toBe(false)
    expect(isLibExternal('@ai-sdk/mcp')).toBe(false)
    expect(isLibExternal('@ai-sdk/gateway')).toBe(false)
    expect(isLibExternal('@modelcontextprotocol/sdk')).toBe(false)
    expect(isLibExternal('@modelcontextprotocol/sdk/client/sse.js')).toBe(false)
    expect(isLibExternal('@opentiny/next')).toBe(false)

    for (const dep of LIB_EXTERNAL_PACKAGES) {
      expect(isLibExternal(dep)).toBe(true)
    }
    expect(isLibExternal('zod/v4')).toBe(true)
    expect(isLibExternal('./agent/AgentModelProvider.ts')).toBe(false)
  })

  it('复现：发布 dist 若仍裸 import ai 或 node:http，Angular 安装即失败——前置执行 vite 库构建；步骤扫描 dist 裸 import；期望无 ai/@ai-sdk/MCP/@opentiny/next/Node 内置泄漏', () => {
    const build = spawnSync(
      'pnpm',
      ['exec', 'vite', 'build', '--config', 'vite.config.ts'],
      {
        cwd: pkgRoot,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'production' },
        timeout: 180_000
      }
    )
    if (build.status !== 0) {
      throw new Error(
        `vite build failed (status=${build.status})\nstdout:\n${build.stdout}\nstderr:\n${build.stderr}`
      )
    }

    const jsFiles = collectJsFiles(distRoot).filter(
      (f) => !f.includes(`${path.sep}runtime`) // runtime 全量打包，单独配置
    )
    expect(jsFiles.length).toBeGreaterThan(0)

    const forbidden: Array<{ file: string; spec: string }> = []
    const allowed = new Set<string>()

    for (const file of jsFiles) {
      // runtime IIFE 产物不在本策略范围
      const base = path.basename(file)
      if (base.startsWith('runtime')) continue

      const text = readFileSync(file, 'utf8')
      for (const spec of collectBareImports(text)) {
        if (isForbiddenDistBareImport(spec)) {
          forbidden.push({ file: path.relative(pkgRoot, file), spec })
        } else {
          allowed.add(spec)
        }
      }
    }

    expect(forbidden, `禁止的裸 import: ${JSON.stringify(forbidden, null, 2)}`).toEqual([])

    // 仍允许的外置依赖应在白名单内（zod 可能带 /v3 /v4 子路径）
    for (const spec of allowed) {
      const root = spec.startsWith('@')
        ? spec.split('/').slice(0, 2).join('/')
        : spec.split('/')[0]
      expect(
        (LIB_EXTERNAL_PACKAGES as readonly string[]).includes(root as (typeof LIB_EXTERNAL_PACKAGES)[number]),
        `意外的外部依赖 ${spec}`
      ).toBe(true)
    }
  })
})
