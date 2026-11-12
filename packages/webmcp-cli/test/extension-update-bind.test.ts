import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { ExtensionUpdateService } from '../src/extension-update/service.js'
import { ExtensionUpdateError } from '../src/extension-update/errors.js'
import { EXTENSION_KEY, createSandbox, extensionFiles, readJson, writeFiles } from './helpers/extension-fixture.js'

const HOUR = 60 * 60 * 1000

async function reasonOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
  } catch (err) {
    if (err instanceof ExtensionUpdateError) return err.reason
    throw err
  }
  throw new Error('预期失败，实际成功')
}

describe('extension/bind 绑定安装目录', () => {
  let sandbox: ReturnType<typeof createSandbox>
  let picked: string | null
  let confirmAnswer: boolean
  let now: number
  const confirm = vi.fn()
  const pickDirectory = vi.fn()
  let service: ExtensionUpdateService

  beforeEach(() => {
    sandbox = createSandbox()
    writeFiles(sandbox.installDir, extensionFiles({ version: '1.4.0', channel: 'stable', publicKeys: ['PK1'] }))
    picked = sandbox.installDir
    confirmAnswer = true
    now = Date.parse('2026-11-11T00:00:00Z')
    pickDirectory.mockReset().mockImplementation(async () => picked)
    confirm.mockReset().mockImplementation(async () => confirmAnswer)
    service = new ExtensionUpdateService({
      baseDir: sandbox.baseDir,
      pickDirectory,
      confirm,
      now: () => now
    })
  })

  afterEach(() => sandbox.cleanup())

  const bindingsFile = () => path.join(sandbox.baseDir, 'extension-bindings.json')

  it('弹出目录框与确认框，确认后写入 pending 绑定并返回目录信息；请求里的路径不被使用', async () => {
    const result: any = await service.handle('extension/bind', { path: '/etc', realPath: '/etc' }, 'instance-a')

    expect(pickDirectory).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      bindingId: expect.any(String),
      realPath: sandbox.installDir,
      name: 'Tiny Robot',
      version: '1.4.0',
      extensionKey: EXTENSION_KEY,
      channel: 'stable',
      publicKeys: ['PK1']
    })
    expect(confirm).toHaveBeenCalledWith({
      realPath: sandbox.installDir,
      name: 'Tiny Robot',
      version: '1.4.0',
      channel: 'stable'
    })
    const stored = readJson(bindingsFile())
    expect(stored.bindings).toEqual([
      expect.objectContaining({
        bindingId: result.bindingId,
        instanceId: 'instance-a',
        realPath: sandbox.installDir,
        state: 'pending',
        highestSequence: 0
      })
    ])
    if (process.platform !== 'win32') {
      expect(fs.statSync(bindingsFile()).mode & 0o777).toBe(0o600)
    }
  })

  it.skipIf(process.platform === 'win32')('所选目录是符号链接时拒绝，且不写入绑定', async () => {
    const link = path.join(sandbox.root, 'link-to-extension')
    fs.symlinkSync(sandbox.installDir, link)
    picked = link

    expect(await reasonOf(service.handle('extension/bind', {}, 'instance-a'))).toBe('directory_rejected')
    expect(confirm).not.toHaveBeenCalled()
    expect(fs.existsSync(bindingsFile())).toBe(false)
  })

  it('manifest.json 没有 key 或缺少 update-trust.json 时拒绝', async () => {
    writeFiles(sandbox.installDir, extensionFiles({ version: '1.4.0', key: '' }))
    expect(await reasonOf(service.handle('extension/bind', {}, 'instance-a'))).toBe('directory_rejected')

    writeFiles(sandbox.installDir, extensionFiles({ version: '1.4.0' }))
    fs.rmSync(path.join(sandbox.installDir, 'update-trust.json'))
    expect(await reasonOf(service.handle('extension/bind', {}, 'instance-a'))).toBe('directory_rejected')
  })

  it('用户在目录框或确认框取消时返回 canceled', async () => {
    picked = null
    expect(await reasonOf(service.handle('extension/bind', {}, 'instance-a'))).toBe('canceled')

    picked = sandbox.installDir
    confirmAnswer = false
    expect(await reasonOf(service.handle('extension/bind', {}, 'instance-a'))).toBe('canceled')
    expect(fs.existsSync(bindingsFile())).toBe(false)
  })

  it('bind_accept 启用绑定并删除同一实例的其他绑定', async () => {
    const first: any = await service.handle('extension/bind', {}, 'instance-a')
    await service.handle('extension/bind_accept', { bindingId: first.bindingId }, 'instance-a')
    const other: any = await service.handle('extension/bind', {}, 'instance-b')
    const second: any = await service.handle('extension/bind', {}, 'instance-a')

    await service.handle('extension/bind_accept', { bindingId: second.bindingId }, 'instance-a')

    const stored = readJson(bindingsFile()).bindings
    expect(stored.map((b: any) => [b.bindingId, b.state])).toEqual([
      [other.bindingId, 'pending'],
      [second.bindingId, 'active']
    ])
  })

  it('其他实例不能启用或删除该绑定', async () => {
    const binding: any = await service.handle('extension/bind', {}, 'instance-a')

    expect(await reasonOf(service.handle('extension/bind_accept', { bindingId: binding.bindingId }, 'instance-b'))).toBe(
      'binding_not_found'
    )
    expect(await reasonOf(service.handle('extension/bind_reject', { bindingId: binding.bindingId }, 'instance-b'))).toBe(
      'binding_not_found'
    )
    expect(readJson(bindingsFile()).bindings).toHaveLength(1)
  })

  it('bind_reject 删除 pending 绑定', async () => {
    const binding: any = await service.handle('extension/bind', {}, 'instance-a')

    await service.handle('extension/bind_reject', { bindingId: binding.bindingId }, 'instance-a')

    expect(readJson(bindingsFile()).bindings).toEqual([])
  })

  it('pending 绑定 24 小时后被清除，不能再启用', async () => {
    const binding: any = await service.handle('extension/bind', {}, 'instance-a')
    now += 25 * HOUR

    expect(await reasonOf(service.handle('extension/bind_accept', { bindingId: binding.bindingId }, 'instance-a'))).toBe(
      'binding_not_found'
    )
    expect(readJson(bindingsFile()).bindings).toEqual([])
  })

  it('缺少 bindingId 时返回 invalid_params', async () => {
    expect(await reasonOf(service.handle('extension/bind_accept', {}, 'instance-a'))).toBe('invalid_params')
  })
})
