import { execSync, spawn } from 'child_process'
import { platform } from 'os'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { DEBUG_PORT, getDebugVersionUrl } from './constants.js'

export type ChromeEnsureStatus = 'running' | 'launched' | 'not_installed' | 'launch_failed'

/**
 * 检查 Chrome 是否已经在指定端口开启远程调试
 */
export async function isChromeRunning(port: number = DEBUG_PORT): Promise<boolean> {
  try {
    const response = await fetch(getDebugVersionUrl(port))
    return response.ok
  } catch {
    return false
  }
}

/**
 * 获取 Chrome 可执行文件路径
 */
export function getChromePath(): string | null {
  const os = platform()
  const paths: string[] = []

  if (os === 'win32') {
    paths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`
    )
  } else if (os === 'darwin') {
    paths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome'
    )
  } else {
    paths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium'
    )
  }

  for (const path of paths) {
    if (path && existsSync(path)) {
      return path
    }
  }

  try {
    const command =
      os === 'win32' ? 'where chrome' : 'which google-chrome || which chromium-browser || which chromium'
    const result = execSync(command, { encoding: 'utf-8', stdio: 'pipe' }).trim()
    const foundPaths = result.split('\n').filter(Boolean)
    if (foundPaths.length > 0 && existsSync(foundPaths[0])) {
      return foundPaths[0]
    }
  } catch {
    // 忽略错误
  }

  return null
}

/**
 * 独立用户数据目录，避免与普通 Chrome 实例冲突
 */
function getUserDataDir(): string {
  const dir = join(tmpdir(), 'webmcp-cli-profile')
  mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * 启动 Chrome 并开启远程调试
 */
export async function launchChrome(chromePath: string, port: number = DEBUG_PORT): Promise<void> {
  const userDataDir = getUserDataDir()
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]

  console.error(`正在启动 Chrome (端口: ${port})...`)
  console.error(`路径: ${chromePath}`)

  const child = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore'
  })

  child.unref()
}

/**
 * 确保 Chrome 正在运行，如果未运行则启动
 */
export async function ensureChromeRunning(): Promise<ChromeEnsureStatus> {
  if (await isChromeRunning(DEBUG_PORT)) {
    console.error(`检测到 Chrome 已在运行 (端口: ${DEBUG_PORT})`)
    return 'running'
  }

  const chromePath = getChromePath()
  if (!chromePath) {
    return 'not_installed'
  }

  await launchChrome(chromePath, DEBUG_PORT)

  const maxRetries = 15
  for (let retries = 1; retries <= maxRetries; retries++) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    if (await isChromeRunning(DEBUG_PORT)) {
      console.error('Chrome 已成功启动')
      return 'launched'
    }
    console.error(`等待 Chrome 启动... (${retries}/${maxRetries})`)
  }

  return 'launch_failed'
}
