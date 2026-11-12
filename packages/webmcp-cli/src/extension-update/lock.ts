import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { ExtensionUpdateError } from './errors.js'

/** 锁目录已建好但 owner 文件还没写入的窗口；超过这个时间仍无 owner 视为创建者已退出 */
const OWNERLESS_STALE_MS = 60_000

function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (err: any) {
    return err?.code === 'EPERM'
  }
}

function isStale(lockPath: string): boolean {
  const ownerFile = path.join(lockPath, 'owner')
  try {
    const pid = parseInt(fs.readFileSync(ownerFile, 'utf8'), 10)
    return !isProcessAlive(pid)
  } catch {
    try {
      return Date.now() - fs.statSync(lockPath).mtimeMs > OWNERLESS_STALE_MS
    } catch {
      return true
    }
  }
}

function tryAcquire(lockPath: string): boolean {
  try {
    fs.mkdirSync(lockPath)
  } catch (err: any) {
    if (err?.code === 'EEXIST') return false
    throw err
  }
  fs.writeFileSync(path.join(lockPath, 'owner'), String(process.pid), { mode: 0o600 })
  return true
}

/**
 * 按安装目录真实路径加的跨进程锁。`mkdir` 是原子操作，用锁目录是否存在表示占用；
 * 持有进程已退出时回收该锁。拿不到锁时立即抛出 `busy`，不等待。
 */
export async function withDirectoryLock<T>(locksDir: string, realPath: string, run: () => Promise<T>): Promise<T> {
  fs.mkdirSync(locksDir, { recursive: true, mode: 0o700 })
  const lockPath = path.join(locksDir, createHash('sha256').update(realPath).digest('hex'))

  let acquired = tryAcquire(lockPath)
  if (!acquired && isStale(lockPath)) {
    fs.rmSync(lockPath, { recursive: true, force: true })
    acquired = tryAcquire(lockPath)
  }
  if (!acquired) {
    throw new ExtensionUpdateError('busy', '安装目录正被另一项更新操作使用，请稍后重试')
  }

  try {
    return await run()
  } finally {
    fs.rmSync(lockPath, { recursive: true, force: true })
  }
}
