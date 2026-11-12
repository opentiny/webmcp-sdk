import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

export interface BindingRecord {
  bindingId: string
  instanceId: string
  realPath: string
  extensionKey: string
  channel: string
  publicKeys: string[]
  state: 'pending' | 'active'
  highestSequence: number
  createdAt: string
}

export type TxnPhase =
  | 'prepared'
  | 'swapping'
  | 'swapped'
  | 'confirmed'
  | 'rolling_back'
  | 'rolled_back'
  | 'needs_recovery'

export interface PermissionDiff {
  permissions: string[]
  host_permissions: string[]
  optional_permissions: string[]
  optional_host_permissions: string[]
  content_script_matches: string[]
}

export interface TxnRecord {
  txnId: string
  bindingId: string
  realPath: string
  fromVersion: string
  toVersion: string
  sequence: number
  payloadHash: string
  previousPublicKeys: string[]
  nextPublicKeys: string[]
  permissionDiff: PermissionDiff
  diffHash: string
  stagingDir: string
  backupDir: string
  failedDir: string
  phase: TxnPhase
  createdAt: string
  updatedAt: string
}

const TXN_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** 先写同目录临时文件再改名，读方不会看到写了一半的 JSON */
function writeJsonAtomic(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 })
  fs.renameSync(tmp, file)
}

/** `~/.robot-wxt/` 下的绑定记录、事务记录与锁目录 */
export class UpdateStore {
  readonly bindingsFile: string
  readonly txnDir: string
  readonly locksDir: string

  constructor(readonly baseDir: string) {
    this.bindingsFile = path.join(baseDir, 'extension-bindings.json')
    this.txnDir = path.join(baseDir, 'update-txn')
    this.locksDir = path.join(baseDir, 'locks')
  }

  readBindings(): BindingRecord[] {
    if (!fs.existsSync(this.bindingsFile)) return []
    const data = JSON.parse(fs.readFileSync(this.bindingsFile, 'utf8'))
    return Array.isArray(data?.bindings) ? data.bindings : []
  }

  writeBindings(bindings: BindingRecord[]): void {
    writeJsonAtomic(this.bindingsFile, { schemaVersion: 1, bindings })
  }

  isValidTxnId(txnId: unknown): txnId is string {
    return typeof txnId === 'string' && TXN_ID_PATTERN.test(txnId)
  }

  readTxn(txnId: string): TxnRecord | null {
    if (!this.isValidTxnId(txnId)) return null
    const file = path.join(this.txnDir, `${txnId}.json`)
    if (!fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  }

  writeTxn(txn: TxnRecord): void {
    writeJsonAtomic(path.join(this.txnDir, `${txn.txnId}.json`), txn)
  }

  listTxns(): TxnRecord[] {
    if (!fs.existsSync(this.txnDir)) return []
    return fs
      .readdirSync(this.txnDir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => this.readTxn(name.slice(0, -'.json'.length)))
      .filter((txn): txn is TxnRecord => txn !== null)
  }
}
