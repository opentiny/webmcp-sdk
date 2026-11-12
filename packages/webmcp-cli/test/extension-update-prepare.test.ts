import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { buildZip, generateSigningKey, readJson, sha256Hex, zipOfFiles } from './helpers/extension-fixture.js'
import { createUpdateHarness, reasonOf } from './helpers/update-harness.js'

function stagingDirs(installDir: string): string[] {
  const parent = path.dirname(installDir)
  return fs.readdirSync(parent).filter((name) => name.startsWith(`${path.basename(installDir)}.staging-`))
}

describe('extension/prepare 准备新版本', () => {
  let h: Awaited<ReturnType<typeof createUpdateHarness>>

  beforeEach(async () => {
    h = await createUpdateHarness()
  })

  afterEach(async () => {
    await h.cleanup()
  })

  it('下载、校验并解压到暂存目录，返回新增的权限；同一清单重复调用返回同一事务', async () => {
    const envelope = h.release({ version: '1.5.0' })

    const result = await h.prepare(envelope)

    expect(result).toEqual({
      txnId: expect.any(String),
      realPath: h.sandbox.installDir,
      fromVersion: '1.4.0',
      toVersion: '1.5.0',
      permissionDiff: {
        permissions: ['notifications'],
        host_permissions: ['https://b.example/*'],
        optional_permissions: [],
        optional_host_permissions: [],
        content_script_matches: ['https://c.example/*']
      },
      diffHash: expect.stringMatching(/^[0-9a-f]{64}$/)
    })
    const staging = `${h.sandbox.installDir}.staging-${result.txnId}`
    expect(readJson(path.join(staging, 'manifest.json')).version).toBe('1.5.0')
    expect(readJson(path.join(h.sandbox.installDir, 'manifest.json')).version).toBe('1.4.0')

    expect(await h.prepare(envelope)).toEqual(result)
    expect(stagingDirs(h.sandbox.installDir)).toHaveLength(1)
  })

  it('pending 绑定或其他实例的请求返回 binding_not_found', async () => {
    const envelope = h.release()
    expect(await reasonOf(h.prepare(envelope, 'instance-b'))).toBe('binding_not_found')

    const pending = await h.call('extension/bind', {}, 'instance-c')
    expect(
      await reasonOf(h.call('extension/prepare', { bindingId: pending.bindingId, envelope }, 'instance-c'))
    ).toBe('binding_not_found')
  })

  it('签名不是绑定公钥签的返回 signature_invalid；双签中任一有效即接受', async () => {
    const stranger = generateSigningKey()
    expect(await reasonOf(h.prepare(h.release({ signers: [stranger] })))).toBe('signature_invalid')

    const tampered = h.release()
    tampered.payload = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(tampered.payload, 'base64').toString()), version: '9.0.0' })
    ).toString('base64')
    expect(await reasonOf(h.prepare(tampered))).toBe('signature_invalid')

    const result = await h.prepare(h.release({ signers: [stranger, h.signer] }))
    expect(result.toVersion).toBe('1.5.0')
  })

  it('清单字段不满足条件时返回对应原因，且不下载', async () => {
    expect(await reasonOf(h.prepare(h.release({ payload: { channel: 'beta' } })))).toBe('channel_mismatch')
    expect(await reasonOf(h.prepare(h.release({ version: '1.4.0' })))).toBe('version_not_newer')
    expect(await reasonOf(h.prepare(h.release({ version: '1.3.9' })))).toBe('version_not_newer')
    expect(await reasonOf(h.prepare(h.release({ payload: { sequence: 0 } })))).toBe('sequence_rollback')
    expect(await reasonOf(h.prepare(h.release({ payload: { size: 300 * 1024 * 1024 } })))).toBe('size_exceeded')
    expect(await reasonOf(h.prepare(h.release({ payload: { url: 'file:///etc/passwd' } })))).toBe('manifest_invalid')
    expect(await reasonOf(h.prepare({ payload: 'not-base64!', signatures: [] }))).toBe('manifest_invalid')
    expect(stagingDirs(h.sandbox.installDir)).toEqual([])
  })

  it('实际下载的大小或哈希与清单不符时拒绝', async () => {
    const pkg = zipOfFiles(h.versionFiles('1.5.0'))
    expect(await reasonOf(h.prepare(h.release({ zip: pkg, payload: { sha256: sha256Hex(Buffer.from('x')) } })))).toBe(
      'hash_mismatch'
    )
    expect(await reasonOf(h.prepare(h.release({ zip: pkg, payload: { size: pkg.length - 1 } })))).toBe(
      'size_exceeded'
    )
    expect(await reasonOf(h.prepare(h.release({ zip: pkg, payload: { size: pkg.length + 1 } })))).toBe(
      'size_exceeded'
    )
    expect(stagingDirs(h.sandbox.installDir)).toEqual([])
  })

  it('跟随不超过 5 次的重定向；超过 5 次、跳到非 http(s) 或 URL 带凭据时返回 download_failed', async () => {
    const pkg = zipOfFiles(h.versionFiles('1.5.0'))
    let target = h.hostPackage(pkg)
    for (let i = 0; i < 5; i++) target = h.hostPackage(Buffer.alloc(0), { status: 302, location: target })
    expect((await h.prepare(h.release({ zip: pkg, payload: { url: target } }))).toVersion).toBe('1.5.0')

    let tooFar = h.hostPackage(pkg)
    for (let i = 0; i < 6; i++) tooFar = h.hostPackage(Buffer.alloc(0), { status: 302, location: tooFar })
    expect(await reasonOf(h.prepare(h.release({ version: '1.6.0', zip: pkg, payload: { url: tooFar } })))).toBe(
      'download_failed'
    )

    const toFile = h.hostPackage(Buffer.alloc(0), { status: 302, location: 'file:///etc/passwd' })
    expect(await reasonOf(h.prepare(h.release({ version: '1.6.0', zip: pkg, payload: { url: toFile } })))).toBe(
      'download_failed'
    )

    const withCredentials = h.hostPackage(pkg).replace('http://', 'http://user:secret@')
    expect(
      await reasonOf(h.prepare(h.release({ version: '1.6.0', zip: pkg, payload: { url: withCredentials } })))
    ).toBe('download_failed')
  })

  it.each([
    ['路径穿越', [{ name: '../evil.js', data: 'x' }]],
    ['绝对路径', [{ name: '/tmp/evil.js', data: 'x' }]],
    ['盘符路径', [{ name: 'C:/evil.js', data: 'x' }]],
    ['反斜杠', [{ name: 'dir\\evil.js', data: 'x' }]],
    ['符号链接条目', [{ name: 'link', data: '/etc/passwd', unixMode: 0o120777 }]],
    ['大小写冲突', [{ name: 'a.js', data: 'x' }, { name: 'A.js', data: 'y' }]],
    ['重复路径', [{ name: 'a.js', data: 'x' }, { name: 'a.js', data: 'y' }]]
  ])('压缩包含%s时返回 unzip_rejected，并删除暂存目录', async (_label, badEntries) => {
    const files = Object.entries(h.versionFiles('1.5.0')).map(([name, data]) => ({ name, data }))
    const zip = buildZip([...files, ...badEntries])

    expect(await reasonOf(h.prepare(h.release({ zip })))).toBe('unzip_rejected')
    expect(stagingDirs(h.sandbox.installDir)).toEqual([])
    expect(fs.existsSync(path.join(path.dirname(h.sandbox.installDir), 'evil.js'))).toBe(false)
  })

  it('新包的 key、渠道或版本与预期不符时拒绝', async () => {
    const otherKey = generateSigningKey().publicKey
    const wrongKey = zipOfFiles(h.versionFiles('1.5.0', { key: otherKey }))
    expect(await reasonOf(h.prepare(h.release({ zip: wrongKey })))).toBe('key_mismatch')

    const wrongChannel = zipOfFiles(h.versionFiles('1.5.0', { channel: 'beta' }))
    expect(await reasonOf(h.prepare(h.release({ zip: wrongChannel })))).toBe('channel_mismatch')

    const wrongVersion = zipOfFiles(h.versionFiles('1.5.1'))
    expect(await reasonOf(h.prepare(h.release({ version: '1.5.0', zip: wrongVersion })))).toBe('package_invalid')

    expect(stagingDirs(h.sandbox.installDir)).toEqual([])
  })
})

describe('extension/prepare 解压上限', () => {
  it('条目数超过上限时返回 unzip_rejected', async () => {
    // 新版本包有 manifest.json、update-trust.json、background.js 三个条目
    const h = await createUpdateHarness({ limits: { maxEntries: 2 } })
    try {
      expect(await reasonOf(h.prepare(h.release()))).toBe('unzip_rejected')
    } finally {
      await h.cleanup()
    }
  })

  it('解压后总大小超过上限时返回 unzip_rejected', async () => {
    const h = await createUpdateHarness({ limits: { maxUnzippedBytes: 1024 } })
    try {
      const files = Object.entries(h.versionFiles('1.5.0')).map(([name, data]) => ({ name, data }))
      const zip = buildZip([...files, { name: 'big.bin', data: Buffer.alloc(4096) }])
      expect(await reasonOf(h.prepare(h.release({ zip })))).toBe('unzip_rejected')
    } finally {
      await h.cleanup()
    }
  })
})
