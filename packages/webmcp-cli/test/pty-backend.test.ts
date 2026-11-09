import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { spawnHostPty } from '../src/bridge/pty-backend.js'

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
})
