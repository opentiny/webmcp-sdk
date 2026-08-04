import { describe, expect, it } from 'vitest'
import { collectParamRefs, resolveStepValue } from '../../recorder-webmcp/params'

describe('resolveStepValue', () => {
  it('字面量原样返回', () => {
    expect(resolveStepValue('hello', {})).toBe('hello')
  })

  it('ParamRef 从 args 取值', () => {
    expect(resolveStepValue({ $param: 'q' }, { q: 'opentiny' })).toBe('opentiny')
  })

  it('缺少参数时抛错', () => {
    expect(() => resolveStepValue({ $param: 'q' }, {})).toThrow(/缺少工具参数/)
  })
})

describe('collectParamRefs', () => {
  it('收集 steps 中全部 $param', () => {
    const keys = collectParamRefs([
      { op: 'goto', url: { $param: 'targetUrl' } },
      { op: 'fill', selectors: ['input'], text: { $param: 'keyword' } },
      { op: 'click', selectors: ['button'] }
    ])
    expect(keys.sort()).toEqual(['keyword', 'targetUrl'])
  })
})
