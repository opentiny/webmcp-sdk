import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { generateSigningKey, readJson, zipOfFiles } from './helpers/extension-fixture.js'
import { createUpdateHarness, reasonOf } from './helpers/update-harness.js'

function versionAt(dir: string): string | undefined {
  const file = path.join(dir, 'manifest.json')
  return fs.existsSync(file) ? readJson(file).version : undefined
}

describe('extension recover 中断后恢复', () => {
  let h: Awaited<ReturnType<typeof createUpdateHarness>>
  const rotated = generateSigningKey()

  beforeEach(async () => {
    h = await createUpdateHarness()
  })

  afterEach(async () => {
    await h.cleanup()
  })

  const dir = () => h.sandbox.installDir
  const binding = () => readJson(path.join(h.sandbox.baseDir, 'extension-bindings.json')).bindings[0]
  const txnFile = (txnId: string) => path.join(h.sandbox.baseDir, 'update-txn', `${txnId}.json`)
  const phaseOf = (txnId: string) => readJson(txnFile(txnId)).phase
  /** 把事务记录改成进程被杀时停留的阶段 */
  const crashAt = (txnId: string, phase: string) =>
    fs.writeFileSync(txnFile(txnId), JSON.stringify({ ...readJson(txnFile(txnId)), phase }))

  /** 新包带新的公钥，便于观察恢复后绑定使用哪组公钥 */
  async function prepared(sequence = 5) {
    const zip = zipOfFiles(h.versionFiles('1.5.0', { publicKeys: [rotated.publicKey] }))
    const result = await h.prepare(h.release({ zip, payload: { sequence } }))
    return {
      ...result,
      backup: `${dir()}.bak-${result.txnId}`,
      staging: `${dir()}.staging-${result.txnId}`,
      failed: `${dir()}.failed-${result.txnId}`
    }
  }

  it('替换尚未开始：删除暂存目录，记为 rolled_back', async () => {
    const txn = await prepared()
    crashAt(txn.txnId, 'swapping')

    const reports = await h.service.recover()

    expect(reports).toEqual([expect.objectContaining({ txnId: txn.txnId, realPath: dir(), outcome: 'rolled_back' })])
    expect(phaseOf(txn.txnId)).toBe('rolled_back')
    expect(versionAt(dir())).toBe('1.4.0')
    expect(fs.existsSync(txn.staging)).toBe(false)
  })

  it('第一次改名后中断：把备份改回，删除暂存目录', async () => {
    const txn = await prepared()
    fs.renameSync(dir(), txn.backup)
    crashAt(txn.txnId, 'swapping')

    await h.service.recover()

    expect(phaseOf(txn.txnId)).toBe('rolled_back')
    expect(versionAt(dir())).toBe('1.4.0')
    expect(fs.existsSync(txn.backup)).toBe(false)
    expect(fs.existsSync(txn.staging)).toBe(false)
  })

  it('暂存目录丢失：把备份改回', async () => {
    const txn = await prepared()
    fs.renameSync(dir(), txn.backup)
    fs.rmSync(txn.staging, { recursive: true })
    crashAt(txn.txnId, 'needs_recovery')

    await h.service.recover()

    expect(phaseOf(txn.txnId)).toBe('rolled_back')
    expect(versionAt(dir())).toBe('1.4.0')
  })

  it('替换已完成但未记录：记为 swapped，并更新绑定的已见序号与公钥', async () => {
    const txn = await prepared(9)
    fs.renameSync(dir(), txn.backup)
    fs.renameSync(txn.staging, dir())
    crashAt(txn.txnId, 'swapping')

    const reports = await h.service.recover()

    expect(reports).toEqual([expect.objectContaining({ txnId: txn.txnId, outcome: 'swapped' })])
    expect(phaseOf(txn.txnId)).toBe('swapped')
    expect(versionAt(dir())).toBe('1.5.0')
    expect(binding()).toMatchObject({ highestSequence: 9, publicKeys: [rotated.publicKey] })
  })

  it('回滚第一次改名后中断：把备份改回，绑定公钥恢复为替换前的值', async () => {
    const txn = await prepared()
    await h.call('extension/commit', { txnId: txn.txnId, acceptedDiffHash: txn.diffHash })
    fs.renameSync(dir(), txn.failed)
    crashAt(txn.txnId, 'rolling_back')

    await h.service.recover()

    expect(phaseOf(txn.txnId)).toBe('rolled_back')
    expect(versionAt(dir())).toBe('1.4.0')
    expect(versionAt(txn.failed)).toBe('1.5.0')
    expect(binding().publicKeys).toEqual([h.signer.publicKey])
  })

  it('回滚已完成但未记录：记为 rolled_back', async () => {
    const txn = await prepared()
    await h.call('extension/commit', { txnId: txn.txnId, acceptedDiffHash: txn.diffHash })
    fs.renameSync(dir(), txn.failed)
    fs.renameSync(txn.backup, dir())
    crashAt(txn.txnId, 'rolling_back')

    await h.service.recover()

    expect(phaseOf(txn.txnId)).toBe('rolled_back')
    expect(versionAt(dir())).toBe('1.4.0')
  })

  it('无法判定的状态记为 needs_recovery 并列出各路径；写方法随后返回 needs_recovery', async () => {
    const txn = await prepared()
    fs.renameSync(dir(), path.join(path.dirname(dir()), 'moved-away'))
    crashAt(txn.txnId, 'swapping')

    const reports = await h.service.recover()

    expect(reports).toEqual([
      expect.objectContaining({
        txnId: txn.txnId,
        outcome: 'needs_recovery',
        paths: expect.objectContaining({
          dir: { path: dir(), exists: false },
          staging: { path: txn.staging, exists: true, version: '1.5.0' }
        })
      })
    ])
    expect(phaseOf(txn.txnId)).toBe('needs_recovery')
    expect(await reasonOf(h.prepare(h.release({ version: '1.6.0' })))).toBe('needs_recovery')
  })

  it('写方法执行前自动恢复同一绑定上中断的事务，再继续执行', async () => {
    const txn = await prepared()
    fs.renameSync(dir(), txn.backup)
    crashAt(txn.txnId, 'swapping')

    const next = await h.prepare(h.release({ version: '1.6.0' }))

    expect(phaseOf(txn.txnId)).toBe('rolled_back')
    expect(next.fromVersion).toBe('1.4.0')
    expect(next.toVersion).toBe('1.6.0')
  })

  it('没有中断的事务时返回空列表', async () => {
    const txn = await prepared()
    await h.call('extension/commit', { txnId: txn.txnId, acceptedDiffHash: txn.diffHash })

    expect(await h.service.recover()).toEqual([])
  })
})
