import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { generateSigningKey, readJson, zipOfFiles } from './helpers/extension-fixture.js'
import { createUpdateHarness, reasonOf } from './helpers/update-harness.js'

type RenameHook = (from: string, to: string) => Promise<void> | void

function versionAt(dir: string): string | undefined {
  const file = path.join(dir, 'manifest.json')
  return fs.existsSync(file) ? readJson(file).version : undefined
}

function errnoError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`${code}: resource busy or locked`), { code })
}

describe('extension/commit、confirm、rollback 安装事务', () => {
  let h: Awaited<ReturnType<typeof createUpdateHarness>>
  let renameHook: RenameHook | null

  beforeEach(async () => {
    renameHook = null
    h = await createUpdateHarness({
      rename: async (from, to) => {
        if (renameHook) await renameHook(from, to)
        fs.renameSync(from, to)
      }
    })
  })

  afterEach(async () => {
    await h.cleanup()
  })

  const dir = () => h.sandbox.installDir
  const binding = () => readJson(path.join(h.sandbox.baseDir, 'extension-bindings.json')).bindings[0]
  const commit = (prepared: any, acceptedDiffHash = prepared.diffHash) =>
    h.call('extension/commit', { txnId: prepared.txnId, acceptedDiffHash })
  const status = (txnId: string) => h.call('extension/txn_status', { txnId })

  it('commit 把安装目录换成新版本并保留备份，更新绑定的已见序号与公钥；重复调用返回同样结果', async () => {
    const rotated = generateSigningKey()
    const zip = zipOfFiles(h.versionFiles('1.5.0', { publicKeys: [h.signer.publicKey, rotated.publicKey] }))
    const prepared = await h.prepare(h.release({ zip, payload: { sequence: 7 } }))

    const result = await commit(prepared)

    expect(result).toEqual({ backupDir: `${dir()}.bak-${prepared.txnId}` })
    expect(versionAt(dir())).toBe('1.5.0')
    expect(versionAt(result.backupDir)).toBe('1.4.0')
    expect(fs.existsSync(`${dir()}.staging-${prepared.txnId}`)).toBe(false)
    expect((await status(prepared.txnId)).phase).toBe('swapped')
    expect(binding()).toMatchObject({ highestSequence: 7, publicKeys: [h.signer.publicKey, rotated.publicKey] })

    expect(await commit(prepared)).toEqual(result)
    expect(versionAt(dir())).toBe('1.5.0')
  })

  it('acceptedDiffHash 与事务不符时返回 diff_mismatch，目录不变', async () => {
    const prepared = await h.prepare(h.release())

    expect(await reasonOf(commit(prepared, 'f'.repeat(64)))).toBe('diff_mismatch')
    expect(versionAt(dir())).toBe('1.4.0')
    expect((await status(prepared.txnId)).phase).toBe('prepared')
  })

  it('其他实例的请求返回 binding_not_found；不存在或格式不对的 txnId 返回 txn_not_found', async () => {
    const prepared = await h.prepare(h.release())

    expect(await reasonOf(h.call('extension/commit', { txnId: prepared.txnId, acceptedDiffHash: prepared.diffHash }, 'instance-b'))).toBe(
      'binding_not_found'
    )
    expect(await reasonOf(status('00000000-0000-4000-8000-000000000000'))).toBe('txn_not_found')
    expect(await reasonOf(status('../extension-bindings'))).toBe('txn_not_found')
  })

  it('目录被占用导致第一次改名失败时返回 rename_locked，不重试，事务仍可再次提交', async () => {
    const prepared = await h.prepare(h.release())
    let calls = 0
    renameHook = () => {
      calls++
      throw errnoError('EBUSY')
    }

    expect(await reasonOf(commit(prepared))).toBe('rename_locked')
    expect(calls).toBe(1)
    expect(versionAt(dir())).toBe('1.4.0')
    expect((await status(prepared.txnId)).phase).toBe('prepared')

    renameHook = null
    await commit(prepared)
    expect(versionAt(dir())).toBe('1.5.0')
  })

  it('第二次改名失败时把备份改回，事务记为 rolled_back', async () => {
    const prepared = await h.prepare(h.release())
    renameHook = (from) => {
      if (from.includes('.staging-')) throw errnoError('EIO')
    }

    expect(await reasonOf(commit(prepared))).toBe('rename_failed')
    expect(versionAt(dir())).toBe('1.4.0')
    expect((await status(prepared.txnId)).phase).toBe('rolled_back')
  })

  it('第二次改名与改回都失败时事务记为 needs_recovery', async () => {
    const prepared = await h.prepare(h.release())
    renameHook = (from) => {
      if (from.includes('.staging-') || from.includes('.bak-')) throw errnoError('EIO')
    }

    expect(await reasonOf(commit(prepared))).toBe('needs_recovery')
    expect(fs.existsSync(dir())).toBe(false)
    expect((await status(prepared.txnId)).phase).toBe('needs_recovery')
  })

  it('confirm 删除同一绑定更早的备份与失败目录，保留本次备份', async () => {
    const first = await h.prepare(h.release({ version: '1.5.0' }))
    await commit(first)
    await h.call('extension/confirm', { txnId: first.txnId })
    await h.call('extension/rollback', { txnId: first.txnId })
    expect(fs.existsSync(`${dir()}.failed-${first.txnId}`)).toBe(true)

    const second = await h.prepare(h.release({ version: '1.6.0' }))
    await commit(second)
    await h.call('extension/confirm', { txnId: second.txnId })

    expect((await status(second.txnId)).phase).toBe('confirmed')
    expect(fs.existsSync(`${dir()}.failed-${first.txnId}`)).toBe(false)
    expect(versionAt(`${dir()}.bak-${second.txnId}`)).toBe('1.4.0')
    expect(versionAt(dir())).toBe('1.6.0')
  })

  it('rollback 把新版本移到 .failed 目录并改回备份，绑定公钥恢复；重复调用返回同样结果', async () => {
    const rotated = generateSigningKey()
    const zip = zipOfFiles(h.versionFiles('1.5.0', { publicKeys: [rotated.publicKey] }))
    const prepared = await h.prepare(h.release({ zip }))
    await commit(prepared)
    await h.call('extension/confirm', { txnId: prepared.txnId })

    const result = await h.call('extension/rollback', { txnId: prepared.txnId })

    expect(result).toEqual({ restoredVersion: '1.4.0' })
    expect(versionAt(dir())).toBe('1.4.0')
    expect(versionAt(`${dir()}.failed-${prepared.txnId}`)).toBe('1.5.0')
    expect((await status(prepared.txnId)).phase).toBe('rolled_back')
    expect(binding().publicKeys).toEqual([h.signer.publicKey])

    expect(await h.call('extension/rollback', { txnId: prepared.txnId })).toEqual(result)
  })

  it('未替换的事务不能确认或回滚', async () => {
    const prepared = await h.prepare(h.release())

    expect(await reasonOf(h.call('extension/confirm', { txnId: prepared.txnId }))).toBe('phase_invalid')
    expect(await reasonOf(h.call('extension/rollback', { txnId: prepared.txnId }))).toBe('phase_invalid')
  })

  it('txn_status 返回阶段与各路径的状态', async () => {
    const prepared = await h.prepare(h.release())
    await commit(prepared)

    expect(await status(prepared.txnId)).toEqual({
      phase: 'swapped',
      paths: {
        dir: { path: dir(), exists: true, version: '1.5.0' },
        backup: { path: `${dir()}.bak-${prepared.txnId}`, exists: true, version: '1.4.0' },
        staging: { path: `${dir()}.staging-${prepared.txnId}`, exists: false },
        failed: { path: `${dir()}.failed-${prepared.txnId}`, exists: false }
      }
    })
  })

  it('同一目录上的写操作正在进行时，其他写操作返回 busy，txn_status 不受影响', async () => {
    const prepared = await h.prepare(h.release())
    let release!: () => void
    let entered!: () => void
    const inRename = new Promise<void>((resolve) => (entered = resolve))
    renameHook = () =>
      new Promise<void>((resolve) => {
        release = resolve
        entered()
      })

    const pending = commit(prepared)
    await inRename

    expect(await reasonOf(h.call('extension/rollback', { txnId: prepared.txnId }))).toBe('busy')
    expect(await reasonOf(h.call('extension/confirm', { txnId: prepared.txnId }))).toBe('busy')
    expect(await reasonOf(h.prepare(h.release({ version: '1.6.0' })))).toBe('busy')
    expect((await status(prepared.txnId)).phase).toBe('swapping')

    renameHook = null
    release()
    await pending
    expect(versionAt(dir())).toBe('1.5.0')
  })
})
