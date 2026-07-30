import { describe, expect, it } from 'vitest'
import { resolveMatchingScripts, shouldSkipBuiltIn } from '../../user-mcp-scripts/resolve'
import type { UserMcpScript, UserMcpScriptsStore } from '../../user-mcp-scripts/types'

function script(partial: Partial<UserMcpScript> & Pick<UserMcpScript, 'id' | 'name' | 'matches'>): UserMcpScript {
  return {
    description: '',
    enabled: true,
    replacesBuiltIn: false,
    source: '//',
    updatedAt: 1,
    ...partial
  }
}

describe('resolveMatchingScripts', () => {
  const store: UserMcpScriptsStore = {
    a: script({
      id: 'a',
      name: 'Alpha',
      matches: ['*://example.com/*'],
      enabled: true
    }),
    b: script({
      id: 'b',
      name: 'Beta',
      matches: ['*://*.other.com/*'],
      enabled: true,
      replacesBuiltIn: true
    }),
    c: script({
      id: 'c',
      name: 'Disabled',
      matches: ['*://example.com/*'],
      enabled: false
    })
  }

  it('只返回 enabled 且匹配的脚本', () => {
    const list = resolveMatchingScripts(store, 'https://example.com/page')
    expect(list.map((s) => s.id)).toEqual(['a'])
  })

  it('子域匹配 replacesBuiltIn 脚本', () => {
    const list = resolveMatchingScripts(store, 'https://www.other.com/')
    expect(list.map((s) => s.id)).toEqual(['b'])
  })

  it('无匹配返回空', () => {
    expect(resolveMatchingScripts(store, 'https://none.test/')).toEqual([])
  })
})

describe('shouldSkipBuiltIn', () => {
  it('匹配且 replacesBuiltIn 为 true 时跳过', () => {
    const store: UserMcpScriptsStore = {
      x: script({
        id: 'x',
        name: 'Override',
        matches: ['*://www.baidu.com/*'],
        replacesBuiltIn: true
      })
    }
    expect(shouldSkipBuiltIn(store, 'https://www.baidu.com/s?wd=1')).toBe(true)
  })

  it('匹配但 replacesBuiltIn 为 false 时不跳过', () => {
    const store: UserMcpScriptsStore = {
      x: script({
        id: 'x',
        name: 'Add',
        matches: ['*://www.baidu.com/*'],
        replacesBuiltIn: false
      })
    }
    expect(shouldSkipBuiltIn(store, 'https://www.baidu.com/')).toBe(false)
  })

  it('未匹配不跳过', () => {
    const store: UserMcpScriptsStore = {
      x: script({
        id: 'x',
        name: 'Override',
        matches: ['*://example.com/*'],
        replacesBuiltIn: true
      })
    }
    expect(shouldSkipBuiltIn(store, 'https://www.baidu.com/')).toBe(false)
  })
})
