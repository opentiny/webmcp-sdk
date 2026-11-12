import { spawn } from 'node:child_process'
import { escapePowerShellString } from '../bridge/directory-picker.js'

export interface BindConfirmInfo {
  realPath: string
  name: string
  version: string
  channel: string
}

const TITLE = '绑定扩展安装目录'

function bindMessage(info: BindConfirmInfo): string {
  return [
    '允许 webmcp-cli 在之后的扩展更新中替换下面这个目录吗？',
    '',
    `路径：${info.realPath}`,
    `扩展：${info.name}`,
    `版本：${info.version}`,
    `渠道：${info.channel}`
  ].join('\n')
}

/** 运行对话框进程，退出码 0 视为确认 */
function run(command: string, args: string[], isConfirmed: (code: number | null, stdout: string) => boolean) {
  return new Promise<boolean>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString()
    })
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString()
    })
    child.on('error', (err: any) => {
      reject(new Error(`无法弹出确认框（${command}）：${err?.message ?? err}`))
    })
    child.on('close', (code) => {
      if (isConfirmed(code, stdout)) {
        resolve(true)
        return
      }
      // macOS 点「取消」返回 1（-128），zenity 点「否」返回 1；其他退出码是对话框本身出错
      if (code === 1 || (code === 0 && command === 'powershell')) {
        resolve(false)
        return
      }
      reject(new Error(`确认框异常退出（${command}，退出码 ${code}）：${stderr.trim()}`))
    })
  })
}

function escapeAppleScript(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/** 弹出系统确认框，展示即将绑定的目录信息；用户确认返回 true */
export function confirmBinding(info: BindConfirmInfo): Promise<boolean> {
  const message = bindMessage(info)

  if (process.platform === 'darwin') {
    const script =
      `display dialog "${escapeAppleScript(message)}" with title "${TITLE}" ` +
      `buttons {"取消", "绑定"} default button "绑定" cancel button "取消" with icon caution`
    return run('osascript', ['-e', script], (code, stdout) => code === 0 && stdout.includes('绑定'))
  }

  if (process.platform === 'win32') {
    // 与目录选择器一样不用 WinForms：以无窗口方式启动的 PowerShell 里 WinForms 拿不到桌面上下文。
    // MB_OKCANCEL | MB_ICONQUESTION | MB_SETFOREGROUND | MB_TOPMOST，IDOK = 1
    const script = `
$code = @'
using System;
using System.Runtime.InteropServices;
public static class Confirm {
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int MessageBoxW(IntPtr hWnd, string text, string caption, uint type);
}
'@
Add-Type -TypeDefinition $code
$r = [Confirm]::MessageBoxW([IntPtr]::Zero, "${escapePowerShellString(message)}", "${escapePowerShellString(TITLE)}", 0x00050021)
if ($r -eq 1) { Write-Output "OK" }
`
    return run('powershell', ['-STA', '-NoProfile', '-WindowStyle', 'Hidden', '-Command', script], (code, stdout) =>
      code === 0 && stdout.includes('OK')
    )
  }

  return run(
    'zenity',
    ['--question', `--title=${TITLE}`, `--text=${message}`, '--no-markup', '--ok-label=绑定', '--cancel-label=取消'],
    (code) => code === 0
  )
}
