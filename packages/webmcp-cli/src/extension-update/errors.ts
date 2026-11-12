/** `extension/*` 业务错误的原因；作为 JSON-RPC 错误的 `data.reason` 返回给扩展 */
export type ExtensionUpdateReason =
  | 'invalid_params'
  | 'busy'
  | 'needs_recovery'
  | 'binding_not_found'
  | 'txn_not_found'
  | 'canceled'
  | 'directory_rejected'
  | 'manifest_invalid'
  | 'signature_invalid'
  | 'channel_mismatch'
  | 'key_mismatch'
  | 'version_not_newer'
  | 'sequence_rollback'
  | 'download_failed'
  | 'size_exceeded'
  | 'hash_mismatch'
  | 'unzip_rejected'
  | 'package_invalid'
  | 'diff_mismatch'
  | 'phase_invalid'
  | 'directory_changed'
  | 'rename_locked'
  | 'rename_failed'

export class ExtensionUpdateError extends Error {
  constructor(
    readonly reason: ExtensionUpdateReason,
    message: string
  ) {
    super(message)
    this.name = 'ExtensionUpdateError'
  }
}
