import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'

import type { ExtensionUpdateHandler } from '../bridge/bridge-client.js'
import { BRIDGE_METHODS } from '../bridge/protocol.js'
import { pickDirectory as pickDirectoryWithDialog, type PickDirectoryOptions } from '../bridge/directory-picker.js'
import { confirmBinding, type BindConfirmInfo } from './dialog.js'
import { ExtensionUpdateError } from './errors.js'
import { withDirectoryLock } from './lock.js'
import {
  compareVersions,
  readExtensionManifest,
  readManifestVersion,
  readUpdateTrust,
  verifyUpdateEnvelope
} from './manifest.js'
import { downloadPackage } from './download.js'
import { extractZipSafely } from './zip.js'
import { UpdateStore, type BindingRecord, type PermissionDiff, type TxnPhase, type TxnRecord } from './store.js'

const PENDING_BINDING_TTL_MS = 24 * 60 * 60 * 1000

/** 处于这些阶段的事务说明进程在改名过程中退出，需要按文件系统状态收尾 */
const UNFINISHED_PHASES: ReadonlySet<TxnPhase> = new Set(['swapping', 'rolling_back', 'needs_recovery'])

export type RecoverOutcome = 'rolled_back' | 'swapped' | 'needs_recovery' | 'busy'

export interface RecoverReport {
  txnId: string
  realPath: string
  fromVersion: string
  toVersion: string
  outcome: RecoverOutcome
  paths: ReturnType<typeof txnPaths>
}

export interface ExtensionUpdateLimits {
  maxPackageBytes: number
  maxUnzippedBytes: number
  maxEntries: number
  maxRedirects: number
  downloadTimeoutMs: number
}

const DEFAULT_LIMITS: ExtensionUpdateLimits = {
  maxPackageBytes: 256 * 1024 * 1024,
  maxUnzippedBytes: 1024 * 1024 * 1024,
  maxEntries: 20_000,
  maxRedirects: 5,
  downloadTimeoutMs: 4 * 60_000
}

export interface ExtensionUpdateServiceOptions {
  /** 绑定、事务与锁的存放目录，默认 `~/.robot-wxt` */
  baseDir?: string
  pickDirectory?: (options: PickDirectoryOptions) => Promise<string | null>
  confirm?: (info: BindConfirmInfo) => Promise<boolean>
  now?: () => number
  platform?: NodeJS.Platform
  fetch?: typeof fetch
  limits?: Partial<ExtensionUpdateLimits>
  /** 目录改名；默认 fs.rename */
  rename?: (from: string, to: string) => Promise<void> | void
}

type Params = Record<string, unknown>

function requireString(params: Params, key: string): string {
  const value = params[key]
  if (typeof value !== 'string' || !value) {
    throw new ExtensionUpdateError('invalid_params', `缺少参数 ${key}`)
  }
  return value
}

function stringsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function contentScriptMatches(manifest: Record<string, unknown>): string[] {
  const scripts = Array.isArray(manifest.content_scripts) ? manifest.content_scripts : []
  return [...new Set(scripts.flatMap((script) => stringsOf((script as { matches?: unknown })?.matches)))]
}

/** 新版本 manifest 相对旧版本新增的权限与匹配范围 */
function computePermissionDiff(before: Record<string, unknown>, after: Record<string, unknown>): PermissionDiff {
  const added = (b: string[], a: string[]) => a.filter((item, i) => !b.includes(item) && a.indexOf(item) === i)
  const field = (key: string) => added(stringsOf(before[key]), stringsOf(after[key]))
  return {
    permissions: field('permissions'),
    host_permissions: field('host_permissions'),
    optional_permissions: field('optional_permissions'),
    optional_host_permissions: field('optional_host_permissions'),
    content_script_matches: added(contentScriptMatches(before), contentScriptMatches(after))
  }
}

function hashPermissionDiff(diff: PermissionDiff): string {
  const ordered = [
    diff.permissions,
    diff.host_permissions,
    diff.optional_permissions,
    diff.optional_host_permissions,
    diff.content_script_matches
  ]
  return createHash('sha256').update(JSON.stringify(ordered)).digest('hex')
}

function prepareResult(txn: TxnRecord) {
  return {
    txnId: txn.txnId,
    realPath: txn.realPath,
    fromVersion: txn.fromVersion,
    toVersion: txn.toVersion,
    permissionDiff: txn.permissionDiff,
    diffHash: txn.diffHash
  }
}

function removeDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true })
}

/** 浏览器正在使用目录内文件时（主要是 Windows）改名返回这些错误码 */
const LOCKED_RENAME_CODES = new Set(['EBUSY', 'EPERM', 'EACCES'])

function renameError(err: unknown, what: string): ExtensionUpdateError {
  const code = (err as NodeJS.ErrnoException)?.code
  if (code && LOCKED_RENAME_CODES.has(code)) {
    return new ExtensionUpdateError('rename_locked', `${what}失败：目录被占用（${code}），请关闭浏览器后重试`)
  }
  return new ExtensionUpdateError('rename_failed', `${what}失败：${(err as Error)?.message ?? err}`)
}

function pathState(target: string) {
  if (!fs.existsSync(target)) return { path: target, exists: false }
  const version = readManifestVersion(target)
  return { path: target, exists: true, ...(version ? { version } : {}) }
}

function txnPaths(txn: TxnRecord) {
  return {
    dir: pathState(txn.realPath),
    backup: pathState(txn.backupDir),
    staging: pathState(txn.stagingDir),
    failed: pathState(txn.failedDir)
  }
}

function bindingNotFound(): ExtensionUpdateError {
  return new ExtensionUpdateError('binding_not_found', '绑定不存在、已过期或不属于当前扩展')
}

/** `extension/*` 方法的实现。每个方法只作用于当前连接 instanceId 名下的绑定 */
export class ExtensionUpdateService implements ExtensionUpdateHandler {
  private readonly store: UpdateStore
  private readonly pickDirectory: NonNullable<ExtensionUpdateServiceOptions['pickDirectory']>
  private readonly confirm: NonNullable<ExtensionUpdateServiceOptions['confirm']>
  private readonly now: () => number
  private readonly platform: NodeJS.Platform
  private readonly fetchImpl?: typeof fetch
  private readonly limits: ExtensionUpdateLimits
  private readonly rename: (from: string, to: string) => Promise<void>

  constructor(options: ExtensionUpdateServiceOptions = {}) {
    this.store = new UpdateStore(options.baseDir ?? path.join(os.homedir(), '.robot-wxt'))
    this.pickDirectory = options.pickDirectory ?? pickDirectoryWithDialog
    this.confirm = options.confirm ?? confirmBinding
    this.now = options.now ?? Date.now
    this.platform = options.platform ?? process.platform
    this.fetchImpl = options.fetch
    this.limits = { ...DEFAULT_LIMITS, ...options.limits }
    const rename = options.rename ?? fs.renameSync
    this.rename = async (from, to) => {
      await rename(from, to)
    }
  }

  async handle(method: string, rawParams: unknown, instanceId: string): Promise<unknown> {
    const params: Params = rawParams && typeof rawParams === 'object' ? (rawParams as Params) : {}
    switch (method) {
      case BRIDGE_METHODS.EXTENSION_BIND:
        return this.bind(instanceId)
      case BRIDGE_METHODS.EXTENSION_BIND_ACCEPT:
        return this.bindAccept(instanceId, requireString(params, 'bindingId'))
      case BRIDGE_METHODS.EXTENSION_BIND_REJECT:
        return this.bindReject(instanceId, requireString(params, 'bindingId'))
      case BRIDGE_METHODS.EXTENSION_PREPARE:
        if (!params.envelope || typeof params.envelope !== 'object') {
          throw new ExtensionUpdateError('invalid_params', '缺少参数 envelope')
        }
        return this.prepare(instanceId, requireString(params, 'bindingId'), params.envelope)
      case BRIDGE_METHODS.EXTENSION_COMMIT:
        return this.commit(instanceId, requireString(params, 'txnId'), requireString(params, 'acceptedDiffHash'))
      case BRIDGE_METHODS.EXTENSION_CONFIRM:
        return this.confirmTxn(instanceId, requireString(params, 'txnId'))
      case BRIDGE_METHODS.EXTENSION_ROLLBACK:
        return this.rollback(instanceId, requireString(params, 'txnId'))
      case BRIDGE_METHODS.EXTENSION_TXN_STATUS: {
        const { txn } = this.findTxn(instanceId, requireString(params, 'txnId'))
        return { phase: txn.phase, paths: txnPaths(txn) }
      }
      default:
        throw new ExtensionUpdateError('invalid_params', `不支持的方法: ${method}`)
    }
  }

  // ── 绑定 ────────────────────────────────────────────────────────────────

  /** 不接受路径参数：目录只能由用户在系统目录框中选择，并在确认框中确认 */
  private async bind(instanceId: string) {
    const selected = await this.pickDirectory({ title: '选择要由 webmcp-cli 更新的扩展安装目录' })
    if (!selected) throw new ExtensionUpdateError('canceled', '已取消选择目录')

    const { realPath, manifest, trust } = this.inspectDirectory(selected)
    const confirmed = await this.confirm({
      realPath,
      name: manifest.name,
      version: manifest.version,
      channel: trust.channel
    })
    if (!confirmed) throw new ExtensionUpdateError('canceled', '已取消绑定')

    const record: BindingRecord = {
      bindingId: randomUUID(),
      instanceId,
      realPath,
      extensionKey: manifest.key,
      channel: trust.channel,
      publicKeys: trust.publicKeys,
      state: 'pending',
      highestSequence: 0,
      createdAt: new Date(this.now()).toISOString()
    }
    this.store.writeBindings([...this.loadBindings(), record])

    return {
      bindingId: record.bindingId,
      realPath,
      name: manifest.name,
      version: manifest.version,
      extensionKey: manifest.key,
      channel: trust.channel,
      publicKeys: trust.publicKeys
    }
  }

  private inspectDirectory(selected: string) {
    const reject = (message: string) => new ExtensionUpdateError('directory_rejected', message)

    let stat: fs.Stats
    try {
      stat = fs.lstatSync(selected)
    } catch {
      throw reject(`目录不存在：${selected}`)
    }
    // Windows 的 junction 在 lstat 中同样报告为符号链接
    if (stat.isSymbolicLink()) throw reject('所选目录是符号链接或 junction，请选择实际的安装目录')
    if (!stat.isDirectory()) throw reject('所选路径不是目录')

    const realPath = fs.realpathSync(selected)
    if (this.platform === 'win32' && (selected.startsWith('\\\\') || realPath.startsWith('\\\\'))) {
      throw reject('不支持网络路径上的安装目录')
    }

    const manifest = readExtensionManifest(realPath)
    if (!manifest) throw reject('目录中没有有效的 manifest.json（需要 version 与 key）')
    const trust = readUpdateTrust(realPath)
    if (!trust) throw reject('目录中没有有效的 update-trust.json，该扩展不支持在线更新')
    return { realPath, manifest, trust }
  }

  /** 读取绑定，并清除超过有效期的 pending 绑定 */
  private loadBindings(): BindingRecord[] {
    const all = this.store.readBindings()
    const now = this.now()
    const alive = all.filter(
      (b) => b.state === 'active' || now - Date.parse(b.createdAt) <= PENDING_BINDING_TTL_MS
    )
    if (alive.length !== all.length) this.store.writeBindings(alive)
    return alive
  }

  private findBinding(instanceId: string, bindingId: string, state: BindingRecord['state']): BindingRecord {
    const binding = this.loadBindings().find((b) => b.bindingId === bindingId)
    if (!binding || binding.instanceId !== instanceId || binding.state !== state) throw bindingNotFound()
    return binding
  }

  private async bindAccept(instanceId: string, bindingId: string) {
    const binding = this.findBinding(instanceId, bindingId, 'pending')
    return withDirectoryLock(this.store.locksDir, binding.realPath, async () => {
      const bindings = this.loadBindings()
      const current = bindings.find((b) => b.bindingId === bindingId)
      if (!current || current.instanceId !== instanceId || current.state !== 'pending') throw bindingNotFound()
      this.store.writeBindings(
        bindings
          .filter((b) => b.bindingId === bindingId || b.instanceId !== instanceId)
          .map((b) => (b.bindingId === bindingId ? { ...b, state: 'active' as const } : b))
      )
      return {}
    })
  }

  private async bindReject(instanceId: string, bindingId: string) {
    this.findBinding(instanceId, bindingId, 'pending')
    this.store.writeBindings(this.loadBindings().filter((b) => b.bindingId !== bindingId))
    return {}
  }

  // ── 准备 ────────────────────────────────────────────────────────────────

  private async prepare(instanceId: string, bindingId: string, envelope: unknown) {
    const { realPath } = this.findBinding(instanceId, bindingId, 'active')
    return withDirectoryLock(this.store.locksDir, realPath, async () => {
      await this.resolveUnfinished(bindingId)
      const binding = this.findBinding(instanceId, bindingId, 'active')
      const { payload, payloadHash } = verifyUpdateEnvelope(envelope, binding.publicKeys)

      const existing = this.store
        .listTxns()
        .find(
          (t) =>
            t.bindingId === bindingId &&
            t.payloadHash === payloadHash &&
            t.phase === 'prepared' &&
            fs.existsSync(t.stagingDir)
        )
      if (existing) return prepareResult(existing)

      if (payload.channel !== binding.channel) {
        throw new ExtensionUpdateError('channel_mismatch', `清单渠道（${payload.channel}）与绑定渠道（${binding.channel}）不符`)
      }
      const installed = readExtensionManifest(realPath)
      if (!installed) throw new ExtensionUpdateError('directory_changed', '安装目录中没有有效的 manifest.json')
      if (compareVersions(payload.version, installed.version) <= 0) {
        throw new ExtensionUpdateError('version_not_newer', `清单版本 ${payload.version} 不高于已安装的 ${installed.version}`)
      }
      if (payload.sequence <= binding.highestSequence) {
        throw new ExtensionUpdateError(
          'sequence_rollback',
          `清单序号 ${payload.sequence} 不大于已见过的 ${binding.highestSequence}`
        )
      }
      if (payload.size > this.limits.maxPackageBytes) {
        throw new ExtensionUpdateError('size_exceeded', `安装包大小超过上限 ${this.limits.maxPackageBytes} 字节`)
      }

      const pkg = await downloadPackage(payload.url, {
        expectedSize: payload.size,
        maxRedirects: this.limits.maxRedirects,
        timeoutMs: this.limits.downloadTimeoutMs,
        fetchImpl: this.fetchImpl
      })
      if (createHash('sha256').update(pkg).digest('hex') !== payload.sha256) {
        throw new ExtensionUpdateError('hash_mismatch', '安装包的 sha256 与清单不符')
      }

      const txnId = randomUUID()
      const stagingDir = `${realPath}.staging-${txnId}`
      let nextTrust: { publicKeys: string[] }
      let permissionDiff: PermissionDiff
      try {
        removeDir(stagingDir)
        extractZipSafely(pkg, stagingDir, this.limits)
        const next = readExtensionManifest(stagingDir)
        const trust = readUpdateTrust(stagingDir)
        if (!next || !trust) {
          throw new ExtensionUpdateError('package_invalid', '安装包中没有有效的 manifest.json 或 update-trust.json')
        }
        if (next.key !== binding.extensionKey) {
          throw new ExtensionUpdateError('key_mismatch', '安装包的扩展 key 与绑定的扩展不同')
        }
        if (trust.channel !== binding.channel) {
          throw new ExtensionUpdateError('channel_mismatch', `安装包渠道（${trust.channel}）与绑定渠道不符`)
        }
        if (next.version !== payload.version) {
          throw new ExtensionUpdateError('package_invalid', `安装包版本 ${next.version} 与清单版本 ${payload.version} 不同`)
        }
        nextTrust = trust
        permissionDiff = computePermissionDiff(installed.raw, next.raw)
      } catch (err) {
        removeDir(stagingDir)
        throw err
      }

      const timestamp = new Date(this.now()).toISOString()
      const txn: TxnRecord = {
        txnId,
        bindingId,
        realPath,
        fromVersion: installed.version,
        toVersion: payload.version,
        sequence: payload.sequence,
        payloadHash,
        previousPublicKeys: binding.publicKeys,
        nextPublicKeys: nextTrust.publicKeys,
        permissionDiff,
        diffHash: hashPermissionDiff(permissionDiff),
        stagingDir,
        backupDir: `${realPath}.bak-${txnId}`,
        failedDir: `${realPath}.failed-${txnId}`,
        phase: 'prepared',
        createdAt: timestamp,
        updatedAt: timestamp
      }
      this.store.writeTxn(txn)
      this.discardOtherPrepared(txn)
      return prepareResult(txn)
    })
  }

  /** 同一绑定只保留最新一次准备：旧的未提交事务删除暂存目录并记为 rolled_back */
  private discardOtherPrepared(latest: TxnRecord): void {
    for (const txn of this.store.listTxns()) {
      if (txn.bindingId !== latest.bindingId || txn.txnId === latest.txnId || txn.phase !== 'prepared') continue
      removeDir(txn.stagingDir)
      this.store.writeTxn({ ...txn, phase: 'rolled_back', updatedAt: latest.updatedAt })
    }
  }

  // ── 事务 ────────────────────────────────────────────────────────────────

  private findTxn(instanceId: string, txnId: string): { txn: TxnRecord; binding: BindingRecord } {
    const txn = this.store.readTxn(txnId)
    if (!txn) throw new ExtensionUpdateError('txn_not_found', '事务不存在')
    const binding = this.loadBindings().find((b) => b.bindingId === txn.bindingId)
    if (!binding || binding.instanceId !== instanceId || binding.state !== 'active') throw bindingNotFound()
    return { txn, binding }
  }

  /** 在目录锁内执行：先重新读取事务，避免使用加锁前读到的旧阶段 */
  private withTxnLock<T>(instanceId: string, txnId: string, run: (txn: TxnRecord) => Promise<T>): Promise<T> {
    const { txn } = this.findTxn(instanceId, txnId)
    return withDirectoryLock(this.store.locksDir, txn.realPath, async () => {
      await this.resolveUnfinished(txn.bindingId)
      return run(this.findTxn(instanceId, txnId).txn)
    })
  }

  private setPhase(txn: TxnRecord, phase: TxnPhase): void {
    txn.phase = phase
    txn.updatedAt = new Date(this.now()).toISOString()
    this.store.writeTxn(txn)
  }

  private updateBinding(bindingId: string, update: (binding: BindingRecord) => BindingRecord): void {
    this.store.writeBindings(this.loadBindings().map((b) => (b.bindingId === bindingId ? update(b) : b)))
  }

  /** 替换完成：绑定改用新包的公钥，并记下已见的最大 sequence */
  private applySwapToBinding(txn: TxnRecord): void {
    this.updateBinding(txn.bindingId, (b) => ({
      ...b,
      highestSequence: Math.max(b.highestSequence, txn.sequence),
      publicKeys: txn.nextPublicKeys
    }))
  }

  private restoreBindingKeys(txn: TxnRecord): void {
    this.updateBinding(txn.bindingId, (b) => ({ ...b, publicKeys: txn.previousPublicKeys }))
  }

  private commit(instanceId: string, txnId: string, acceptedDiffHash: string) {
    return this.withTxnLock(instanceId, txnId, async (txn) => {
      if (txn.phase === 'swapped' || txn.phase === 'confirmed') return { backupDir: txn.backupDir }
      if (txn.phase !== 'prepared') {
        throw new ExtensionUpdateError('phase_invalid', `事务处于 ${txn.phase} 阶段，不能提交`)
      }
      if (acceptedDiffHash !== txn.diffHash) {
        throw new ExtensionUpdateError('diff_mismatch', '确认的权限变化与准备结果不一致，请重新确认')
      }
      if (!fs.existsSync(txn.stagingDir)) {
        throw new ExtensionUpdateError('phase_invalid', '暂存目录不存在，请重新准备更新')
      }
      if (readManifestVersion(txn.realPath) !== txn.fromVersion) {
        throw new ExtensionUpdateError('directory_changed', `安装目录的版本已不是 ${txn.fromVersion}，请重新准备更新`)
      }

      this.setPhase(txn, 'swapping')
      try {
        await this.rename(txn.realPath, txn.backupDir)
      } catch (err) {
        this.setPhase(txn, 'prepared')
        throw renameError(err, '备份当前版本')
      }
      try {
        await this.rename(txn.stagingDir, txn.realPath)
      } catch (err) {
        try {
          await this.rename(txn.backupDir, txn.realPath)
        } catch {
          this.setPhase(txn, 'needs_recovery')
          throw new ExtensionUpdateError(
            'needs_recovery',
            '替换失败且无法自动恢复安装目录，请关闭浏览器后在终端执行 `webmcp-cli extension recover`'
          )
        }
        removeDir(txn.stagingDir)
        this.setPhase(txn, 'rolled_back')
        throw renameError(err, '替换安装目录')
      }
      this.setPhase(txn, 'swapped')
      this.applySwapToBinding(txn)
      return { backupDir: txn.backupDir }
    })
  }

  /** 新版本确认可用：删除同一绑定其他事务登记过的备份与失败目录，保留本次备份 */
  private confirmTxn(instanceId: string, txnId: string) {
    return this.withTxnLock(instanceId, txnId, async (txn) => {
      if (txn.phase === 'confirmed') return {}
      if (txn.phase !== 'swapped') throw new ExtensionUpdateError('phase_invalid', `事务处于 ${txn.phase} 阶段，不能确认`)
      this.setPhase(txn, 'confirmed')
      for (const other of this.store.listTxns()) {
        if (other.bindingId !== txn.bindingId || other.txnId === txn.txnId) continue
        removeDir(other.backupDir)
        removeDir(other.failedDir)
      }
      return {}
    })
  }

  private rollback(instanceId: string, txnId: string) {
    return this.withTxnLock(instanceId, txnId, async (txn) => {
      if (txn.phase === 'rolled_back') return { restoredVersion: txn.fromVersion }
      if (txn.phase !== 'swapped' && txn.phase !== 'confirmed') {
        throw new ExtensionUpdateError('phase_invalid', `事务处于 ${txn.phase} 阶段，不能回滚`)
      }
      if (!fs.existsSync(txn.backupDir)) {
        throw new ExtensionUpdateError('phase_invalid', '备份目录不存在，无法回滚')
      }

      const previous = txn.phase
      this.setPhase(txn, 'rolling_back')
      try {
        await this.rename(txn.realPath, txn.failedDir)
      } catch (err) {
        this.setPhase(txn, previous)
        throw renameError(err, '移走当前版本')
      }
      try {
        await this.rename(txn.backupDir, txn.realPath)
      } catch (err) {
        try {
          await this.rename(txn.failedDir, txn.realPath)
        } catch {
          this.setPhase(txn, 'needs_recovery')
          throw new ExtensionUpdateError(
            'needs_recovery',
            '回滚失败且无法自动恢复安装目录，请关闭浏览器后在终端执行 `webmcp-cli extension recover`'
          )
        }
        this.setPhase(txn, previous)
        throw renameError(err, '恢复备份')
      }
      this.setPhase(txn, 'rolled_back')
      this.restoreBindingKeys(txn)
      return { restoredVersion: txn.fromVersion }
    })
  }

  // ── 恢复 ────────────────────────────────────────────────────────────────

  /**
   * `webmcp-cli extension recover`：逐个处理中断的事务。每个安装目录在自己的锁内处理，
   * 拿不到锁的目录记为 busy。
   */
  async recover(): Promise<RecoverReport[]> {
    const unfinished = this.store.listTxns().filter((t) => UNFINISHED_PHASES.has(t.phase))
    const reports: RecoverReport[] = []
    for (const realPath of new Set(unfinished.map((t) => t.realPath))) {
      const txns = unfinished.filter((t) => t.realPath === realPath)
      try {
        await withDirectoryLock(this.store.locksDir, realPath, async () => {
          for (const txn of txns) reports.push(await this.recoverTxn(txn))
        })
      } catch (err) {
        if (!(err instanceof ExtensionUpdateError && err.reason === 'busy')) throw err
        for (const txn of txns) reports.push({ ...this.reportOf(txn), outcome: 'busy' })
      }
    }
    return reports
  }

  /** 写方法执行前调用（已持有目录锁）：同一绑定上有无法自动处理的事务时拒绝继续 */
  private async resolveUnfinished(bindingId: string): Promise<void> {
    for (const txn of this.store.listTxns()) {
      if (txn.bindingId !== bindingId || !UNFINISHED_PHASES.has(txn.phase)) continue
      const report = await this.recoverTxn(txn)
      if (report.outcome === 'needs_recovery') {
        throw new ExtensionUpdateError(
          'needs_recovery',
          '安装目录处于未完成的替换状态，请关闭浏览器后在终端执行 `webmcp-cli extension recover`'
        )
      }
    }
  }

  private reportOf(txn: TxnRecord): Omit<RecoverReport, 'outcome'> {
    return {
      txnId: txn.txnId,
      realPath: txn.realPath,
      fromVersion: txn.fromVersion,
      toVersion: txn.toVersion,
      paths: txnPaths(txn)
    }
  }

  /** 依据三个路径的实际状态判定，不依赖记录的阶段；规则见 Spec design.md §恢复判定 */
  private async recoverTxn(txn: TxnRecord): Promise<RecoverReport> {
    const dirExists = fs.existsSync(txn.realPath)
    const dirVersion = dirExists ? readManifestVersion(txn.realPath) : undefined
    const backupExists = fs.existsSync(txn.backupDir)
    let outcome: RecoverOutcome

    if (dirExists && dirVersion === txn.fromVersion && !backupExists) {
      removeDir(txn.stagingDir)
      this.setPhase(txn, 'rolled_back')
      this.restoreBindingKeys(txn)
      outcome = 'rolled_back'
    } else if (!dirExists && backupExists) {
      try {
        await this.rename(txn.backupDir, txn.realPath)
        removeDir(txn.stagingDir)
        this.setPhase(txn, 'rolled_back')
        this.restoreBindingKeys(txn)
        outcome = 'rolled_back'
      } catch {
        this.setPhase(txn, 'needs_recovery')
        outcome = 'needs_recovery'
      }
    } else if (dirExists && dirVersion === txn.toVersion && backupExists && !fs.existsSync(txn.failedDir)) {
      this.setPhase(txn, 'swapped')
      this.applySwapToBinding(txn)
      outcome = 'swapped'
    } else {
      this.setPhase(txn, 'needs_recovery')
      outcome = 'needs_recovery'
    }
    return { ...this.reportOf(txn), outcome }
  }
}
