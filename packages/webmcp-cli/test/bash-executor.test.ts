import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { executeBash, resolveShell, BashTimeoutError, BashInvalidParamsError } from '../src/bridge/bash-executor.js'
import { isProcessAlive } from '../src/bridge/daemon.js'

describe('BashExecutor', () => {
  it('应成功执行简单命令并捕获 stdout', async () => {
    const res = await executeBash({ command: 'echo "hello host"' })
    expect(res.exitCode).toBe(0)
    expect(res.stdout).toBe('hello host')
    expect(res.stderr).toBe('')
    expect(res.durationMs).toBeGreaterThanOrEqual(0)
    expect(res.truncated).toBeUndefined()
  })

  it('应捕获非零退出码与 stderr 输出', async () => {
    const res = await executeBash({
      command: 'sh -c "echo error_msg >&2; exit 42"'
    })
    expect(res.exitCode).toBe(42)
    expect(res.stderr).toBe('error_msg')
  })

  it('命令为空时应抛出 BashInvalidParamsError 参数错误', async () => {
    await expect(executeBash({ command: '   ' })).rejects.toBeInstanceOf(BashInvalidParamsError)
    await expect(executeBash({ command: '' })).rejects.toThrow('命令不能为空')
  })

  it('执行超时应被终止并抛出 BashTimeoutError 且子进程被彻底杀死', async () => {
    const pidFile = path.join(os.tmpdir(), `test-bash-timeout-${Date.now()}.pid`)
    let thrownError: any = null
    try {
      await executeBash({
        command: `node -e "const fs = require('fs'); fs.writeFileSync('${pidFile}', String(process.pid)); setTimeout(() => {}, 10000)"`,
        timeoutMs: 150
      })
    } catch (err: any) {
      thrownError = err
    }

    expect(thrownError).toBeInstanceOf(BashTimeoutError)
    expect(thrownError.code).toBe('TIMEOUT')
    expect(thrownError.timeoutMs).toBe(150)
    expect(thrownError.message).toMatch(/超时/)

    // 验证子进程已确实被操作系统终止
    await new Promise((r) => setTimeout(r, 200))
    if (fs.existsSync(pidFile)) {
      const recordedPid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10)
      if (recordedPid) {
        expect(isProcessAlive(recordedPid)).toBe(false)
      }
      try {
        fs.unlinkSync(pidFile)
      } catch {
        // ignore
      }
    }
  })

  it('输出超过 maxBuffer 时应基于 UTF-8 字节精准截断并标记 truncated', async () => {
    // 包含中文字符串：每个汉字占用 3 字节 UTF-8
    const multiByteString = '这是一段用来测试字节截断的中文文本'
    const res = await executeBash({
      command: `echo "${multiByteString}"`,
      maxBuffer: 12
    })
    expect(res.exitCode).toBe(0)
    expect(res.truncated).toBe(true)
    const byteLength = Buffer.byteLength(res.stdout, 'utf8')
    expect(byteLength).toBeLessThanOrEqual(12)
  })

  it('命令结束前应把已经写出的标准输出交给回调，最终结果仍包含这些输出', async () => {
    const chunks: string[] = []
    let settled = false
    const pending = executeBash({
      command: 'echo stream_first; sleep 0.4; echo stream_second',
      timeoutMs: 5000,
      onOutput: (chunk) => {
        if (chunk.stream === 'stdout') chunks.push(chunk.text)
      }
    }).then((res) => {
      settled = true
      return res
    })

    await vi.waitFor(() => {
      expect(chunks.join('')).toContain('stream_first')
    })
    expect(settled).toBe(false)

    const res = await pending
    expect(res.exitCode).toBe(0)
    expect(res.stdout).toContain('stream_first')
    expect(res.stdout).toContain('stream_second')
  })

  it('伪终端模式下，命令结束前应推送已写出的文本，并保留在最终 stdout', async () => {
    if (process.platform === 'win32') return
    const chunks: string[] = []
    let settled = false
    const pending = executeBash({
      command: 'echo tty_first; sleep 0.4; echo tty_second',
      tty: true,
      timeoutMs: 5000,
      onOutput: (chunk) => {
        if (chunk.stream === 'stdout') chunks.push(chunk.text)
      }
    }).then((res) => {
      settled = true
      return res
    })

    await vi.waitFor(() => {
      expect(chunks.join('')).toContain('tty_first')
    })
    expect(settled).toBe(false)

    const res = await pending
    expect(res.exitCode).toBe(0)
    expect(res.stdout).toContain('tty_first')
    expect(res.stdout).toContain('tty_second')
  })

  it('伪终端模式去掉颜色转义，并把分页器固定为 cat', async () => {
    if (process.platform === 'win32') return
    const res = await executeBash({
      command: "printf '\\033[31mred\\033[0m\\n'; printf '%s\\n' \"$GIT_PAGER\"",
      tty: true,
      timeoutMs: 5000
    })
    expect(res.exitCode).toBe(0)
    expect(res.stdout).toContain('red')
    expect(res.stdout).not.toContain('\u001B')
    expect(res.stdout).toContain('cat')
  })

  it('标准输入关闭时，读取 stdin 的命令应读到 EOF 而不是一直等待', async () => {
    const res = await executeBash({ command: 'cat', timeoutMs: 1000 })
    expect(res.exitCode).toBe(0)
    expect(res.stdout).toBe('')
  })

  it('复现：伪终端模式下读取 stdin 的命令应读到 EOF 而不是一直等待', async () => {
    if (process.platform === 'win32') return
    const started = Date.now()
    const res = await executeBash({ command: 'cat', tty: true, timeoutMs: 3000 })
    expect(Date.now() - started).toBeLessThan(2500)
    expect(res.exitCode).toBe(0)
  })

  it('复现：超过 maxBuffer 后仍应继续推送后续输出，最终结果保持截断', async () => {
    const chunks: string[] = []
    const res = await executeBash({
      command: 'node -e "process.stdout.write(\'A\'.repeat(80)); process.stdout.write(\'B\'.repeat(80))"',
      maxBuffer: 40,
      timeoutMs: 5000,
      onOutput: (chunk) => {
        if (chunk.stream === 'stdout') chunks.push(chunk.text)
      }
    })
    expect(res.truncated).toBe(true)
    expect(Buffer.byteLength(res.stdout, 'utf8')).toBeLessThanOrEqual(40)
    expect(chunks.join('')).toContain('B')
    expect(res.stdout.includes('B')).toBe(false)
  })

  it('复现：截断落在 UTF-8 字符中间时，最终结果不应包含替换字符', async () => {
    const res = await executeBash({
      command: 'node -e "process.stdout.write(\'中\')"',
      maxBuffer: 2,
      timeoutMs: 5000
    })
    expect(res.truncated).toBe(true)
    expect(res.stdout.includes('\uFFFD')).toBe(false)
    expect(Buffer.byteLength(res.stdout, 'utf8')).toBeLessThanOrEqual(2)
  })

  it('复现：超时应结束 shell 派生的后台进程，且不等它们关闭管道', async () => {
    if (process.platform === 'win32') return
    const pidFile = path.join(os.tmpdir(), `test-bash-tree-${Date.now()}-${process.pid}.pid`)
    const started = Date.now()
    let thrown: unknown
    let stillAlive = false
    try {
      await executeBash({
        command: `sleep 60 & echo $! > '${pidFile}'; wait`,
        timeoutMs: 500
      })
    } catch (err) {
      thrown = err
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 300))
      if (fs.existsSync(pidFile)) {
        const recordedPid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10)
        stillAlive = Boolean(recordedPid) && isProcessAlive(recordedPid)
        if (stillAlive) {
          try {
            process.kill(-recordedPid, 'SIGKILL')
          } catch {
            try {
              process.kill(recordedPid, 'SIGKILL')
            } catch {
              // 已经退出
            }
          }
        }
      }
    }

    expect(thrown).toBeInstanceOf(BashTimeoutError)
    expect(Date.now() - started).toBeLessThan(8000)
    expect(fs.existsSync(pidFile)).toBe(true)
    expect(stillAlive).toBe(false)
    fs.unlinkSync(pidFile)
  })

  it('应支持自定义环境变量与工作目录', async () => {
    const res = await executeBash({
      command: 'echo $CUSTOM_VAR',
      env: { CUSTOM_VAR: 'TEST_ROBOT_WXT' }
    })
    expect(res.stdout).toBe('TEST_ROBOT_WXT')
  })

  it('跨平台 resolveShell: POSIX 平台应优先读取 SHELL', () => {
    const originalShell = process.env.SHELL
    process.env.SHELL = '/bin/custom_sh'
    expect(resolveShell('darwin')).toBe('/bin/custom_sh')
    process.env.SHELL = originalShell
  })

  it('跨平台 resolveShell: Windows 平台应返回可用 shell（bash.exe 或 powershell.exe）', () => {
    const winShell = resolveShell('win32')
    expect(winShell).toMatch(/(bash\.exe|powershell\.exe)$/i)
  })

  it('当 timeoutMs 为 0、负数、NaN 或 Infinity 时应安全回退至默认超时而不立即触发', async () => {
    const resZero = await executeBash({
      command: 'echo safe_timeout',
      timeoutMs: 0
    })
    expect(resZero.stdout).toBe('safe_timeout')

    const resNeg = await executeBash({
      command: 'echo safe_timeout_neg',
      timeoutMs: -500
    })
    expect(resNeg.stdout).toBe('safe_timeout_neg')

    const resNaN = await executeBash({
      command: 'echo safe_timeout_nan',
      timeoutMs: NaN
    })
    expect(resNaN.stdout).toBe('safe_timeout_nan')

    const resInf = await executeBash({
      command: 'echo safe_timeout_inf',
      timeoutMs: Infinity
    })
    expect(resInf.stdout).toBe('safe_timeout_inf')
  })

  it('当 timeoutMs 为超大数值（如 1e12）时应被安全钳制在最大上限，避免 32 位整数溢出导致误杀', async () => {
    const resLarge = await executeBash({
      command: 'echo safe_timeout_large',
      timeoutMs: 1e12
    })
    expect(resLarge.stdout).toBe('safe_timeout_large')
  })
})
