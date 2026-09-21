import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { resolveWorkspaceDir, WORKSPACES_ROOT } from '../src/bridge/workspace-manager.js'

describe('WorkspaceManager', () => {
  const testConvId = `test_conv_${Date.now()}`

  afterEach(() => {
    const testDir = path.join(WORKSPACES_ROOT, testConvId)
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true })
      } catch {
        // ignore
      }
    }
  })

  it('显式提供 cwd 时若位于 workspace 范围内应正确解析', () => {
    const wsPath = path.resolve(os.homedir(), 'custom-project')
    const subDir = path.join(wsPath, 'src')
    const res = resolveWorkspaceDir({
      cwd: 'src',
      workspacePath: wsPath,
      conversationId: testConvId
    })
    expect(res).toBe(subDir)
  })

  it('显式提供 cwd 时若超出 workspace 范围应抛出 BashInvalidParamsError', () => {
    const wsPath = path.resolve(os.homedir(), 'custom-project')
    expect(() =>
      resolveWorkspaceDir({
        cwd: '/other/outside/path',
        workspacePath: wsPath,
        conversationId: testConvId
      })
    ).toThrowError(/超出已授权工作空间安全边界/)
  })

  it('未提供 cwd 但提供 workspacePath 时使用 workspacePath', () => {
    const wsPath = path.resolve(os.homedir(), 'custom-project')
    const res = resolveWorkspaceDir({
      workspacePath: wsPath,
      conversationId: testConvId
    })
    expect(res).toBe(wsPath)
  })

  it('仅提供 conversationId 时自动创建并返回专属默认目录', () => {
    const expectedDir = path.join(WORKSPACES_ROOT, testConvId)
    expect(fs.existsSync(expectedDir)).toBe(false)

    const res = resolveWorkspaceDir({ conversationId: testConvId })
    expect(res).toBe(expectedDir)
    expect(fs.existsSync(expectedDir)).toBe(true)
  })

  it('conversationId 包含 .. 或非法字符时杜绝路径穿越并收敛至 WORKSPACES_ROOT 之下', () => {
    const res = resolveWorkspaceDir({ conversationId: '../../../etc/passwd' })
    expect(res.startsWith(WORKSPACES_ROOT)).toBe(true)
    expect(res).not.toContain('..')

    const dotRes = resolveWorkspaceDir({ conversationId: '..' })
    expect(dotRes.startsWith(WORKSPACES_ROOT)).toBe(true)
  })

  it('均未提供时回退到默认目录', () => {
    const res = resolveWorkspaceDir({})
    expect(res).toBeTruthy()
    expect(typeof res).toBe('string')
  })
})
