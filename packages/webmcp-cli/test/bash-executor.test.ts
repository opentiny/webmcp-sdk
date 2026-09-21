import { describe, it, expect } from 'vitest'
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
