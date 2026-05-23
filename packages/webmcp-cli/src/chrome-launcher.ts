import { execSync, spawn } from 'child_process'
import { platform } from 'os'
import { existsSync } from 'fs'

const DEBUG_PORT = 9222

/**
 * 检查 Chrome 是否已经在指定端口开启远程调试
 */
export async function isChromeRunning(port: number = DEBUG_PORT): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/json/version`)
    return response.ok
  } catch (err) {
    console.error('Error checking Chrome:', err)
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
    // Windows 常见安装路径
    paths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`
    )
  } else if (os === 'darwin') {
    // macOS 常见安装路径
    paths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome'
    )
  } else {
    // Linux 常见安装路径
    paths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium'
    )
  }

  // 检查路径是否存在
  for (const path of paths) {
    if (existsSync(path)) {
      return path
    }
  }

  // 尝试通过 which/where 命令查找
  try {
    const command = os === 'win32' ? 'where chrome' : 'which google-chrome || which chromium-browser || which chromium'
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
 * 启动 Chrome 并开启远程调试
 */
export async function launchChrome(chromePath: string, port: number = DEBUG_PORT): Promise<void> {
  const args = [`--remote-debugging-port=${port}`, '--no-first-run', '--no-default-browser-check', 'about:blank']

  console.log(`正在启动 Chrome (端口: ${port})...`)
  console.log(`路径: ${chromePath}`)

  const child = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore'
  })

  child.unref()
}

/**
 * 确保 Chrome 正在运行，如果未运行则启动
 */
export async function ensureChromeRunning(): Promise<string> {
  // 1. 检查是否已经在运行
  if (await isChromeRunning(DEBUG_PORT)) {
    console.log(`检测到 Chrome 已在运行 (端口: ${DEBUG_PORT})`)
    return 'running'
  }

  // 2. 查找 Chrome 路径
  const chromePath = getChromePath()
  if (!chromePath) {
    return 'not_installed'
  }

  // 3. 启动 Chrome
  await launchChrome(chromePath, DEBUG_PORT)

  // 4. 等待 Chrome 启动（增加重试次数和间隔）
  let retries = 0
  const maxRetries = 15
  while (retries < maxRetries) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    if (await isChromeRunning(DEBUG_PORT)) {
      console.log('Chrome 已成功启动')
      return 'launched'
    }
    retries++
    console.log(`等待 Chrome 启动... (${retries}/${maxRetries})`)
  }

  return 'launch_failed'
}
