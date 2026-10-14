import { afterEach, describe, expect, it } from 'vitest'
import {
  buildChromeLaunchArgs,
  buildPuppeteerConnectOptions,
  shouldIgnoreCertificateErrors
} from '../src/browser'

const launchBase = {
  cdpPort: 9222,
  userDataDir: '/tmp/webmcp-profile',
  headless: false
}

describe('ignore certificate errors', () => {
  const original = process.env.WEBMCP_IGNORE_CERTIFICATE_ERRORS

  afterEach(() => {
    if (original === undefined) {
      delete process.env.WEBMCP_IGNORE_CERTIFICATE_ERRORS
    } else {
      process.env.WEBMCP_IGNORE_CERTIFICATE_ERRORS = original
    }
  })

  it('默认校验证书，启动参数与连接选项都不忽略证书错误', () => {
    delete process.env.WEBMCP_IGNORE_CERTIFICATE_ERRORS

    expect(shouldIgnoreCertificateErrors()).toBe(false)
    expect(buildChromeLaunchArgs(launchBase)).not.toContain('--ignore-certificate-errors')
    expect(buildPuppeteerConnectOptions('http://127.0.0.1:9222').ignoreHTTPSErrors).not.toBe(true)
  })

  it('WEBMCP_IGNORE_CERTIFICATE_ERRORS=1 时启动参数包含开关，且连接选项忽略证书错误', () => {
    process.env.WEBMCP_IGNORE_CERTIFICATE_ERRORS = '1'

    expect(shouldIgnoreCertificateErrors()).toBe(true)
    const args = buildChromeLaunchArgs({ ...launchBase, headless: true })
    expect(args).toContain('--ignore-certificate-errors')
    expect(args).toContain('--remote-debugging-port=9222')
    expect(args).toContain('--headless=new')
    expect(buildPuppeteerConnectOptions('http://127.0.0.1:9222').ignoreHTTPSErrors).toBe(true)
  })

  it('环境变量不是 1 时仍然校验证书', () => {
    process.env.WEBMCP_IGNORE_CERTIFICATE_ERRORS = 'true'

    expect(shouldIgnoreCertificateErrors()).toBe(false)
    expect(buildChromeLaunchArgs(launchBase)).not.toContain('--ignore-certificate-errors')
    expect(buildPuppeteerConnectOptions('http://127.0.0.1:9222').ignoreHTTPSErrors).not.toBe(true)
  })
})
