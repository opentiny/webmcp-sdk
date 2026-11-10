import { chmodSync, existsSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

// node-pty 预编译包里的 spawn-helper 可能是 0644。安装时改成可执行，
// 避免之后用非 root 用户运行时无法 chmod。
try {
  const pkgJson = createRequire(import.meta.url).resolve('node-pty/package.json')
  const prebuilds = path.join(path.dirname(pkgJson), 'prebuilds')
  if (!existsSync(prebuilds)) process.exit(0)
  for (const entry of readdirSync(prebuilds, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const helper = path.join(prebuilds, entry.name, 'spawn-helper')
    if (!existsSync(helper)) continue
    chmodSync(helper, 0o755)
  }
} catch (err) {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
  if (code === 'EPERM' || code === 'EACCES') {
    console.warn(
      '[webmcp-cli] 无法把 node-pty spawn-helper 设为可执行。交互终端可能启动失败，system/bash 不受影响。'
    )
  }
}
