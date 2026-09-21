import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

export const WORKSPACES_ROOT = path.join(os.homedir(), '.robot-wxt', 'workspaces')

export interface WorkspaceResolveParams {
  cwd?: string
  workspacePath?: string
  conversationId?: string
}

export class BashInvalidParamsError extends Error {
  readonly code = 'INVALID_PARAMS' as const

  constructor(message: string = '参数错误') {
    super(message)
    this.name = 'BashInvalidParamsError'
  }
}

function resolveBaseWorkspace(params: WorkspaceResolveParams): string {
  if (params.workspacePath && typeof params.workspacePath === 'string' && params.workspacePath.trim()) {
    const trimmedWs = params.workspacePath.trim()
    return path.isAbsolute(trimmedWs) ? trimmedWs : path.resolve(os.homedir(), trimmedWs)
  }

  if (params.conversationId && typeof params.conversationId === 'string' && params.conversationId.trim()) {
    // 过滤路径分隔符、保留特殊字符以及点号，杜绝路径穿越
    const safeId = params.conversationId.trim().replace(/[/\\?%*:|"<>.]/g, '_')
    const sessionDir = path.resolve(WORKSPACES_ROOT, safeId || 'default')

    // 严格校验必须位于 WORKSPACES_ROOT 之下
    const relative = path.relative(WORKSPACES_ROOT, sessionDir)
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      return path.join(WORKSPACES_ROOT, 'default')
    }
    return sessionDir
  }

  return path.join(WORKSPACES_ROOT, 'default')
}

/**
 * 按照优先级解析 Bash 执行目标工作目录，并强制实施安全边界收敛：
 * 1. 确定当前会话基准工作空间：优先采用已绑定的 workspacePath，次选基于 conversationId 的专属隔离沙箱，缺省回退至默认沙箱
 * 2. 严格收敛 cwd：若传入 cwd，必须位于基准工作空间内部（允许相对子路径或处于基准路径下的绝对路径）；
 *    杜绝路径穿越（..）或逃逸到系统根目录等未授权位置，越界时抛出 BashInvalidParamsError。
 */
export function resolveWorkspaceDir(params: WorkspaceResolveParams = {}): string {
  const baseDir = resolveBaseWorkspace(params)

  if (!fs.existsSync(baseDir)) {
    try {
      fs.mkdirSync(baseDir, { recursive: true, mode: 0o755 })
    } catch {
      // ignore
    }
  }

  if (!params.cwd || typeof params.cwd !== 'string' || !params.cwd.trim()) {
    return baseDir
  }

  const trimmedCwd = params.cwd.trim()
  const targetDir = path.isAbsolute(trimmedCwd) ? path.resolve(trimmedCwd) : path.resolve(baseDir, trimmedCwd)

  const relative = path.relative(baseDir, targetDir)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new BashInvalidParamsError(`目标执行路径超出已授权工作空间安全边界: ${trimmedCwd}`)
  }

  return targetDir
}
