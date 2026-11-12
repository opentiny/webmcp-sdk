import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { withDirectoryLock } from '../src/extension-update/lock.js'
import { ExtensionUpdateError } from '../src/extension-update/errors.js'

const require = createRequire(import.meta.url)
// 用 --import 在同一进程加载 TS：tsx 的 CLI 会另起子进程，杀掉它不会结束真正持锁的进程
const TSX_LOADER = pathToFileURL(require.resolve('tsx/esm')).href
const LOCK_MODULE = pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/extension-update/lock.ts')).href

async function reasonOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (err) {
    if (err instanceof ExtensionUpdateError) return err.reason
    throw err
  }
}

/** 在另一个进程里持有锁，直到被杀掉 */
async function holdLockInChild(locksDir: string, realPath: string): Promise<ChildProcess> {
  const script = path.join(locksDir, '..', 'hold-lock.mts')
  fs.writeFileSync(
    script,
    `import { withDirectoryLock } from ${JSON.stringify(LOCK_MODULE)}\n` +
      `await withDirectoryLock(${JSON.stringify(locksDir)}, ${JSON.stringify(realPath)}, () => {\n` +
      `  console.log('locked')\n` +
      `  return new Promise(() => {})\n` +
      `})\n`
  )
  const child = spawn(process.execPath, ['--import', TSX_LOADER, script], { stdio: ['ignore', 'pipe', 'inherit'] })
  await new Promise<void>((resolve, reject) => {
    child.stdout!.on('data', (d: Buffer) => d.toString().includes('locked') && resolve())
    child.on('exit', (code) => reject(new Error(`持锁进程提前退出：${code}`)))
  })
  return child
}

describe('按安装目录加的跨进程锁', () => {
  let root: string
  let child: ChildProcess | null = null

  afterEach(() => {
    child?.kill('SIGKILL')
    child = null
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('另一个进程持有锁时立即返回 busy；持有进程退出后可以重新获得', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'webmcp-lock-'))
    const locksDir = path.join(root, 'locks')
    child = await holdLockInChild(locksDir, '/ext/tiny-robot')

    expect(await reasonOf(withDirectoryLock(locksDir, '/ext/tiny-robot', async () => 'ran'))).toBe('busy')
    expect(await withDirectoryLock(locksDir, '/ext/other', async () => 'other')).toBe('other')

    child.kill('SIGKILL')
    await new Promise((resolve) => child!.once('exit', resolve))
    child = null

    expect(await withDirectoryLock(locksDir, '/ext/tiny-robot', async () => 'ran')).toBe('ran')
  }, 20_000)
})
