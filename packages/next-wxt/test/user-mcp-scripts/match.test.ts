import { describe, expect, it } from 'vitest'
import {
  matchUrl,
  validateMatchPattern,
  validateMatchPatterns,
  matchAny
} from '../../user-mcp-scripts/match'

describe('validateMatchPattern', () => {
  it('接受常见油猴模式', () => {
    expect(validateMatchPattern('*://example.com/*').ok).toBe(true)
    expect(validateMatchPattern('*://*.example.com/*').ok).toBe(true)
    expect(validateMatchPattern('https://www.baidu.com/*').ok).toBe(true)
  })

  it('拒绝 host 含端口', () => {
    expect(validateMatchPattern('http://localhost:5173/*').ok).toBe(false)
  })

  it('拒绝空或非法模式', () => {
    expect(validateMatchPattern('').ok).toBe(false)
    expect(validateMatchPattern('example.com').ok).toBe(false)
    expect(validateMatchPattern('*://').ok).toBe(false)
  })

  it('批量校验要求至少一条', () => {
    expect(validateMatchPatterns([]).ok).toBe(false)
    expect(validateMatchPatterns(['*://a.com/']).ok).toBe(true)
  })
})

describe('matchUrl', () => {
  it('精确 host + 通配 path', () => {
    expect(matchUrl('*://example.com/*', 'https://example.com/')).toBe(true)
    expect(matchUrl('*://example.com/*', 'https://example.com/foo?x=1')).toBe(true)
    expect(matchUrl('*://example.com/*', 'https://www.example.com/')).toBe(false)
  })

  it('*.host 匹配 apex 与子域', () => {
    expect(matchUrl('*://*.example.com/*', 'https://example.com/a')).toBe(true)
    expect(matchUrl('*://*.example.com/*', 'https://www.example.com/a')).toBe(true)
    expect(matchUrl('*://*.example.com/*', 'https://other.com/a')).toBe(false)
  })

  it('scheme 约束', () => {
    expect(matchUrl('https://example.com/*', 'http://example.com/')).toBe(false)
    expect(matchUrl('https://example.com/*', 'https://example.com/')).toBe(true)
    expect(matchUrl('*://example.com/*', 'ftp://example.com/')).toBe(false)
  })

  it('非法 url 返回 false', () => {
    expect(matchUrl('*://example.com/*', 'not-a-url')).toBe(false)
  })

  it('matchAny 任一命中', () => {
    expect(
      matchAny(['*://a.com/*', '*://b.com/*'], 'https://b.com/x')
    ).toBe(true)
    expect(matchAny(['*://a.com/*'], 'https://b.com/x')).toBe(false)
  })
})
