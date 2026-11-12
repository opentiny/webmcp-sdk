import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { ExtensionUpdateError } from './errors.js'

export interface ZipLimits {
  maxEntries: number
  maxUnzippedBytes: number
}

interface CentralEntry {
  name: string
  isDirectory: boolean
  method: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50
const UNIX_TYPE_MASK = 0o170000
const UNIX_REGULAR = 0o100000
const UNIX_DIRECTORY = 0o040000

function reject(message: string): ExtensionUpdateError {
  return new ExtensionUpdateError('unzip_rejected', message)
}

function findEndOfCentralDirectory(buf: Buffer): number {
  // EOCD 固定 22 字节，后面最多跟 65535 字节注释
  const lowest = Math.max(0, buf.length - 22 - 0xffff)
  for (let i = buf.length - 22; i >= lowest; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) return i
  }
  throw reject('不是有效的 zip 文件')
}

/** 条目路径必须是相对路径，只用 `/` 分隔，不含 `.`、`..` 或空段 */
function checkEntryName(name: string): void {
  if (!name || name.includes('\0') || name.includes('\\')) throw reject(`压缩包条目路径不合法：${name}`)
  if (name.startsWith('/') || /^[A-Za-z]:/.test(name)) throw reject(`压缩包含绝对路径：${name}`)
  const segments = name.replace(/\/$/, '').split('/')
  if (segments.some((s) => s === '' || s === '.' || s === '..')) throw reject(`压缩包条目路径不合法：${name}`)
}

function readCentralDirectory(buf: Buffer, limits: ZipLimits): CentralEntry[] {
  if (buf.length < 22) throw reject('不是有效的 zip 文件')
  const eocd = findEndOfCentralDirectory(buf)
  const totalEntries = buf.readUInt16LE(eocd + 10)
  const centralSize = buf.readUInt32LE(eocd + 12)
  const centralOffset = buf.readUInt32LE(eocd + 16)
  if (buf.readUInt16LE(eocd + 4) !== 0 || buf.readUInt16LE(eocd + 6) !== 0) throw reject('不支持分卷 zip')
  if (totalEntries === 0xffff || centralOffset === 0xffffffff) throw reject('不支持 zip64')
  if (totalEntries > limits.maxEntries) throw reject(`压缩包条目数超过上限 ${limits.maxEntries}`)
  if (centralOffset + centralSize > eocd) throw reject('zip 中央目录越界')

  const entries: CentralEntry[] = []
  const seenPaths = new Set<string>()
  let totalBytes = 0
  let p = centralOffset
  for (let i = 0; i < totalEntries; i++) {
    if (p + 46 > eocd || buf.readUInt32LE(p) !== CENTRAL_SIGNATURE) throw reject('zip 中央目录损坏')
    const madeByHost = buf.readUInt16LE(p + 4) >> 8
    const flags = buf.readUInt16LE(p + 8)
    const method = buf.readUInt16LE(p + 10)
    const compressedSize = buf.readUInt32LE(p + 20)
    const uncompressedSize = buf.readUInt32LE(p + 24)
    const nameLength = buf.readUInt16LE(p + 28)
    const extraLength = buf.readUInt16LE(p + 30)
    const commentLength = buf.readUInt16LE(p + 32)
    const externalAttributes = buf.readUInt32LE(p + 38)
    const localHeaderOffset = buf.readUInt32LE(p + 42)
    const nameEnd = p + 46 + nameLength
    if (nameEnd > eocd) throw reject('zip 中央目录损坏')
    const name = buf.toString('utf8', p + 46, nameEnd)
    p = nameEnd + extraLength + commentLength

    checkEntryName(name)
    if (flags & 0x1) throw reject(`不支持加密条目：${name}`)
    if (method !== 0 && method !== 8) throw reject(`不支持的压缩方式 ${method}：${name}`)
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) throw reject('不支持 zip64')

    const isDirectory = name.endsWith('/')
    // 由 Unix 系统写入（host 3）的条目在外部属性高 16 位记录文件类型
    if (madeByHost === 3) {
      const type = (externalAttributes >>> 16) & UNIX_TYPE_MASK
      if (type !== 0 && type !== (isDirectory ? UNIX_DIRECTORY : UNIX_REGULAR)) {
        throw reject(`压缩包含符号链接或特殊文件：${name}`)
      }
    }

    // 按小写比较，同时拦住完全重复的路径与仅大小写不同的路径（后者在不区分大小写的文件系统上互相覆盖）
    const folded = name.replace(/\/$/, '').toLowerCase()
    if (seenPaths.has(folded)) throw reject(`压缩包含重复或仅大小写不同的路径：${name}`)
    seenPaths.add(folded)

    totalBytes += uncompressedSize
    if (totalBytes > limits.maxUnzippedBytes) throw reject(`解压后总大小超过上限 ${limits.maxUnzippedBytes} 字节`)

    entries.push({ name, isDirectory, method, compressedSize, uncompressedSize, localHeaderOffset })
  }
  return entries
}

function readEntryData(buf: Buffer, entry: CentralEntry): Buffer {
  const header = entry.localHeaderOffset
  if (header + 30 > buf.length || buf.readUInt32LE(header) !== LOCAL_SIGNATURE) {
    throw reject(`zip 本地文件头损坏：${entry.name}`)
  }
  const start = header + 30 + buf.readUInt16LE(header + 26) + buf.readUInt16LE(header + 28)
  const end = start + entry.compressedSize
  if (end > buf.length) throw reject(`zip 条目越界：${entry.name}`)
  const raw = buf.subarray(start, end)

  let data: Buffer
  if (entry.method === 0) {
    data = raw
  } else {
    try {
      data = zlib.inflateRawSync(raw, { maxOutputLength: Math.max(1, entry.uncompressedSize) })
    } catch {
      throw reject(`zip 条目解压失败或大小与声明不符：${entry.name}`)
    }
  }
  if (data.length !== entry.uncompressedSize) throw reject(`zip 条目大小与声明不符：${entry.name}`)
  return data
}

/**
 * 先校验全部条目，再解压到 targetDir（应为不存在的空目录）。
 * 拒绝路径穿越、绝对路径、符号链接与特殊文件、重复或仅大小写不同的路径，并限制条目数与解压后总大小。
 */
export function extractZipSafely(buf: Buffer, targetDir: string, limits: ZipLimits): void {
  const entries = readCentralDirectory(buf, limits)
  const root = path.resolve(targetDir)
  fs.mkdirSync(root, { recursive: true })

  for (const entry of entries) {
    const target = path.resolve(root, entry.name)
    if (!target.startsWith(root + path.sep)) throw reject(`压缩包条目路径不合法：${entry.name}`)
    try {
      if (entry.isDirectory) {
        fs.mkdirSync(target, { recursive: true })
        continue
      }
      const data = readEntryData(buf, entry)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, data, { flag: 'wx', mode: 0o644 })
    } catch (err) {
      if (err instanceof ExtensionUpdateError) throw err
      throw reject(`解压 ${entry.name} 失败：${(err as Error).message}`)
    }
  }
}
