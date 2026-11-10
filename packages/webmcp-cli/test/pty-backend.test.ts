import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isProcessAlive } from '../src/bridge/daemon.js'
import { describeSpawnHelperChmodError, resolveSpawnFile, spawnHostPty } from '../src/bridge/pty-backend.js'

const describePty = process.platform === 'win32' ? describe.skip : describe

describePty('spawnHostPty', () => {
  it('把输入送进交互式 shell，并把输出读回来', async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), 'host-pty-'))
    const pty = spawnHostPty({ cwd, cols: 80, rows: 24, shell: '/bin/bash' })
    let output = ''
    let exitInfo: { exitCode: number | null; signal: string | null } | null = null
    pty.onData((data) => {
      output += data
    })
    pty.onExit((info) => {
      exitInfo = info
    })

    pty.write('printf PTY_MARKER\\n\n')
    const started = Date.now()
    while (!output.includes('PTY_MARKER') && Date.now() - started < 8000) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    pty.kill()
    const exitStarted = Date.now()
    while (!exitInfo && Date.now() - exitStarted < 3000) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    expect(output).toContain('PTY_MARKER')
    expect(exitInfo).not.toBeNull()
  }, 15000)

  it('复现：关闭终端后，忽略 SIGHUP 的前台进程也会退出', async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), 'host-pty-hup-'))
    const pidFile = path.join(cwd, 'ignore-hup.pid')
    writeFileSync(
      path.join(cwd, 'hang.js'),
      `process.on('SIGHUP', () => {})\nrequire('fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid))\nsetInterval(() => {}, 1000)\n`
    )
    const pty = spawnHostPty({ cwd, cols: 80, rows: 24, shell: '/bin/bash' })
    pty.onData(() => {})
    pty.write('node hang.js\n')

    const started = Date.now()
    while (!existsSync(pidFile) && Date.now() - started < 8000) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    expect(existsSync(pidFile)).toBe(true)
    const pid = parseInt(readFileSync(pidFile, 'utf8').trim(), 10)
    expect(isProcessAlive(pid)).toBe(true)
    pty.kill()

    const killStarted = Date.now()
    while (isProcessAlive(pid) && Date.now() - killStarted < 4000) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    expect(isProcessAlive(pid)).toBe(false)
  }, 20000)
})

describe('resolveSpawnFile', () => {
  it('复现：可执行文件只在 PATH 最后一项时也解析成绝对路径', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'spawn-file-'))
    const first = path.join(root, 'first')
    const last = path.join(root, 'last')
    mkdirSync(first)
    mkdirSync(last)
    const bin = path.join(last, 'powershell.exe')
    writeFileSync(bin, '')
    expect(resolveSpawnFile('powershell.exe', [first, last].join(path.delimiter))).toBe(bin)
  })

  it('复现：chmod 权限不足时说明 spawn-helper 无法修复', () => {
    const message = describeSpawnHelperChmodError('/opt/node-pty/prebuilds/darwin-arm64/spawn-helper', 'EPERM')
    expect(message).toContain('spawn-helper')
    expect(message).toContain('chmod 755')
    expect(describeSpawnHelperChmodError('/tmp/spawn-helper', 'ENOENT')).toBeNull()
  })
})
