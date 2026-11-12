import type { RecoverReport } from '../extension-update/service.js'

function describePath(label: string, state: { path: string; exists: boolean; version?: string }): string {
  if (!state.exists) return `  ${label}：${state.path}（不存在）`
  return `  ${label}：${state.path}（存在${state.version ? `，版本 ${state.version}` : '，没有可读的 manifest.json'}）`
}

export function formatRecoverReport(report: RecoverReport): string {
  const head = `${report.realPath}（事务 ${report.txnId}）`
  switch (report.outcome) {
    case 'rolled_back':
      return `✅ ${head}：已恢复到 ${report.fromVersion}。如浏览器已打开，请在扩展管理页重新加载该扩展。`
    case 'swapped':
      return `✅ ${head}：新版本 ${report.toVersion} 已就位。请在浏览器扩展管理页重新加载该扩展；如需退回，可在扩展中回滚。`
    case 'busy':
      return `⏳ ${head}：安装目录正被另一项更新操作使用，请稍后重试。`
    case 'needs_recovery':
      return [
        `⚠️ ${head}：无法自动判断该怎么恢复，请根据以下状态手动处理（${report.fromVersion} → ${report.toVersion}）：`,
        describePath('安装目录', report.paths.dir),
        describePath('备份目录', report.paths.backup),
        describePath('暂存目录', report.paths.staging),
        describePath('失败目录', report.paths.failed)
      ].join('\n')
  }
}

/** `webmcp-cli extension <子命令>`；返回进程退出码 */
export async function runExtensionCommand(args: string[]): Promise<number> {
  if (args[0] !== 'recover') {
    console.log('用法：webmcp-cli extension recover    处理被中断的扩展更新，使安装目录回到一致状态')
    return args[0] ? 1 : 0
  }
  const { ExtensionUpdateService } = await import('../extension-update/service.js')
  const reports = await new ExtensionUpdateService().recover()
  if (reports.length === 0) {
    console.log('没有需要恢复的扩展更新。')
    return 0
  }
  for (const report of reports) console.log(formatRecoverReport(report))
  return reports.some((r) => r.outcome === 'needs_recovery' || r.outcome === 'busy') ? 1 : 0
}
