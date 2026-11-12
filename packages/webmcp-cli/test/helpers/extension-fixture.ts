import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import zlib from 'node:zlib'
import type { AddressInfo } from 'node:net'
import { createHash, generateKeyPairSync, sign, type KeyObject } from 'node:crypto'

/** 生成 SPKI DER base64 形式的 P-256 公钥及对应私钥 */
export function generateSigningKey() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    privateKey
  }
}

export interface ExtensionFiles {
  version: string
  key?: string
  channel?: string
  publicKeys?: string[]
  name?: string
  manifest?: Record<string, unknown>
}

export const EXTENSION_KEY = generateSigningKey().publicKey

/** 扩展产物根目录里的 manifest.json 与 update-trust.json */
export function extensionFiles(options: ExtensionFiles): Record<string, string> {
  return {
    'manifest.json': JSON.stringify({
      manifest_version: 3,
      name: options.name ?? 'Tiny Robot',
      version: options.version,
      ...(options.key === '' ? {} : { key: options.key ?? EXTENSION_KEY }),
      ...options.manifest
    }),
    'update-trust.json': JSON.stringify({
      schemaVersion: 1,
      channel: options.channel ?? 'stable',
      publicKeys: options.publicKeys ?? ['PK-default'],
      manifestUrl: 'https://example.com/update.json'
    })
  }
}

export function writeFiles(dir: string, files: Record<string, string>) {
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(dir, name)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content)
  }
}

/** 临时根目录：home 代替 ~/.robot-wxt，extensions 下放安装目录 */
export function createSandbox() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'webmcp-ext-update-')))
  const baseDir = path.join(root, 'home', '.robot-wxt')
  const installDir = path.join(root, 'extensions', 'tiny-robot')
  fs.mkdirSync(installDir, { recursive: true })
  return {
    root,
    baseDir,
    installDir,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true })
  }
}

export function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

// ── 更新清单 ────────────────────────────────────────────────────────────────

export function keyIdOf(publicKeyBase64: string): string {
  return createHash('sha256').update(Buffer.from(publicKeyBase64, 'base64')).digest().subarray(0, 8).toString('hex')
}

export function signEnvelope(
  payload: Record<string, unknown>,
  signers: Array<{ publicKey: string; privateKey: KeyObject }>
) {
  const bytes = Buffer.from(JSON.stringify(payload), 'utf8')
  return {
    payload: bytes.toString('base64'),
    signatures: signers.map((signer) => ({
      keyId: keyIdOf(signer.publicKey),
      sig: sign('sha256', bytes, { key: signer.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64')
    }))
  }
}

export function sha256Hex(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

// ── zip 写入（可构造不安全条目） ────────────────────────────────────────────

export interface ZipEntry {
  name: string
  data?: string | Buffer
  /** 0 存储，8 deflate；默认 8 */
  method?: 0 | 8
  /** Unix 文件类型与权限，写入外部属性高 16 位，如符号链接 0o120777 */
  unixMode?: number
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function buildZip(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data ?? '', 'utf8')
    const method = entry.method ?? 8
    const body = method === 8 ? zlib.deflateRawSync(raw) : raw
    const crc = crc32(raw)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(method, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(name.length, 26)
    locals.push(local, name, body)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE((3 << 8) | 20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(method, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(body.length, 20)
    central.writeUInt32LE(raw.length, 24)
    central.writeUInt16LE(name.length, 28)
    const mode = entry.unixMode ?? (entry.name.endsWith('/') ? 0o040755 : 0o100644)
    central.writeUInt32LE((mode << 16) >>> 0, 38)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)

    offset += local.length + name.length + body.length
  }
  const centralDir = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralDir.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, centralDir, end])
}

export function zipOfFiles(files: Record<string, string>): Buffer {
  return buildZip(Object.entries(files).map(([name, data]) => ({ name, data })))
}

// ── 本地 HTTP 服务 ─────────────────────────────────────────────────────────

export interface Route {
  status?: number
  body?: Buffer
  location?: string
}

export async function startHttpServer(routes: Record<string, Route>) {
  const server = http.createServer((req, res) => {
    const route = routes[req.url ?? '']
    if (!route) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(route.status ?? 200, route.location ? { location: route.location } : {})
    res.end(route.body)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: (pathname: string) => `http://127.0.0.1:${port}${pathname}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  }
}
