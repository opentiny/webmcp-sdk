import fs from 'node:fs'
import path from 'node:path'
import { createHash, createPublicKey, verify, type KeyObject } from 'node:crypto'
import { ExtensionUpdateError } from './errors.js'

const VERSION_PATTERN = /^\d+(\.\d+){0,3}$/

export function isValidVersion(version: unknown): version is string {
  return typeof version === 'string' && VERSION_PATTERN.test(version)
}

/** 比较 1–4 段整数版本号，缺段补 0；返回值的符号表示大小关系 */
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let i = 0; i < 4; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export interface ExtensionManifest {
  name: string
  version: string
  key: string
  raw: Record<string, unknown>
}

export interface UpdateTrust {
  schemaVersion: 1
  channel: string
  publicKeys: string[]
  manifestUrl: string
}

function readJsonFile(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

/** 读取扩展目录的 manifest.json；缺少文件或 version / key 不合法时返回 null */
export function readExtensionManifest(dir: string): ExtensionManifest | null {
  const raw = readJsonFile(path.join(dir, 'manifest.json'))
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Record<string, unknown>
  if (!isValidVersion(m.version) || typeof m.key !== 'string' || !m.key) return null
  return { name: typeof m.name === 'string' ? m.name : '', version: m.version, key: m.key, raw: m }
}

/** 只读 manifest.json 的 version，用于判断目录处于哪个版本 */
export function readManifestVersion(dir: string): string | undefined {
  const raw = readJsonFile(path.join(dir, 'manifest.json')) as { version?: unknown } | null
  return typeof raw?.version === 'string' ? raw.version : undefined
}

export function readUpdateTrust(dir: string): UpdateTrust | null {
  const raw = readJsonFile(path.join(dir, 'update-trust.json'))
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  const publicKeys = t.publicKeys
  if (
    t.schemaVersion !== 1 ||
    typeof t.channel !== 'string' ||
    !t.channel ||
    !Array.isArray(publicKeys) ||
    publicKeys.length === 0 ||
    !publicKeys.every((k) => typeof k === 'string' && k)
  ) {
    return null
  }
  return {
    schemaVersion: 1,
    channel: t.channel,
    publicKeys: publicKeys as string[],
    manifestUrl: typeof t.manifestUrl === 'string' ? t.manifestUrl : ''
  }
}

// ── 更新清单 ────────────────────────────────────────────────────────────────

export interface UpdatePayload {
  schemaVersion: 1
  channel: string
  version: string
  sequence: number
  url: string
  sha256: string
  size: number
}

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/
const SHA256_PATTERN = /^[0-9a-f]{64}$/

function decodeBase64(value: unknown): Buffer | null {
  if (typeof value !== 'string' || value.length % 4 !== 0 || !BASE64_PATTERN.test(value)) return null
  return Buffer.from(value, 'base64')
}

function keyIdOf(spki: Buffer): string {
  return createHash('sha256').update(spki).digest().subarray(0, 8).toString('hex')
}

function hasTrustedSignature(signatures: unknown[], payloadBytes: Buffer, publicKeys: string[]): boolean {
  for (const publicKey of publicKeys) {
    const spki = decodeBase64(publicKey)
    if (!spki) continue
    const keyId = keyIdOf(spki)
    let key: KeyObject
    try {
      key = createPublicKey({ key: spki, format: 'der', type: 'spki' })
    } catch {
      continue
    }
    for (const entry of signatures) {
      const { keyId: entryKeyId, sig } = (entry ?? {}) as { keyId?: unknown; sig?: unknown }
      if (entryKeyId !== keyId) continue
      const sigBytes = decodeBase64(sig)
      if (sigBytes && verify('sha256', payloadBytes, { key, dsaEncoding: 'ieee-p1363' }, sigBytes)) return true
    }
  }
  return false
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

function isValidPayload(value: unknown): value is UpdatePayload {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return (
    p.schemaVersion === 1 &&
    typeof p.channel === 'string' &&
    isValidVersion(p.version) &&
    Number.isSafeInteger(p.sequence) &&
    isHttpUrl(p.url) &&
    typeof p.sha256 === 'string' &&
    SHA256_PATTERN.test(p.sha256) &&
    Number.isSafeInteger(p.size) &&
    (p.size as number) > 0
  )
}

/**
 * 校验顺序：结构 → 签名 → payload 字段。未通过验签的字节不当作 JSON 解释。
 * 渠道、版本与 sequence 的比较由调用方完成。
 */
export function verifyUpdateEnvelope(envelope: unknown, publicKeys: string[]): { payload: UpdatePayload; payloadHash: string } {
  const invalid = (message: string) => new ExtensionUpdateError('manifest_invalid', message)
  if (!envelope || typeof envelope !== 'object') throw invalid('更新清单格式无效')
  const { payload, signatures } = envelope as { payload?: unknown; signatures?: unknown }
  const payloadBytes = decodeBase64(payload)
  if (!payloadBytes || !Array.isArray(signatures)) throw invalid('更新清单格式无效')

  if (!hasTrustedSignature(signatures, payloadBytes, publicKeys)) {
    throw new ExtensionUpdateError('signature_invalid', '更新清单签名无效')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(payloadBytes.toString('utf8'))
  } catch {
    throw invalid('更新清单内容不是合法 JSON')
  }
  if (!isValidPayload(parsed)) throw invalid('更新清单字段不合法')
  return { payload: parsed, payloadHash: createHash('sha256').update(payload as string).digest('hex') }
}
