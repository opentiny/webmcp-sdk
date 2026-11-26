import { describe, it, expect } from 'vitest'
import { DiffContextTracker, extractYamlLines } from '../../page-tools/structured-yaml-diff'

describe('structured-yaml-diff - DiffContextTracker 与基础解析单元测试', () => {
  it('extractYamlLines 正确剥离 ```yaml 围栏并保留纯内容行', () => {
    expect(extractYamlLines('```yaml\n- main "根"\n  - button #0 "确定"\n```')).toEqual([
      '- main "根"',
      '  - button #0 "确定"',
    ])
    expect(extractYamlLines('```yaml\n```')).toEqual([])
  })

  it('DiffContextTracker 按节点身份下标匹配：同名无 #ref 容器间移动时重新输出目标容器锚点', () => {
    const prevComparable = [
      { line: '- main "根"', trimmed: '- main "根"', indent: 0, ref: null, parentIndex: -1, directParent: '' },
      { line: '  - list', trimmed: '- list', indent: 2, ref: null, parentIndex: 0, directParent: '- main "根"' },
      { line: '    - button #1 "A"', trimmed: '- button #1 "A"', indent: 4, ref: 1, parentIndex: 1, directParent: '- list' },
    ]
    const currComparable = [
      { line: '- main "根"', trimmed: '- main "根"', indent: 0, ref: null, parentIndex: -1, directParent: '' },
      { line: '  - list', trimmed: '- list', indent: 2, ref: null, parentIndex: 0, directParent: '- main "根"' },
      { line: '  - list', trimmed: '- list', indent: 2, ref: null, parentIndex: 0, directParent: '- main "根"' },
      { line: '    - button #1 "A"', trimmed: '- button #1 "A"', indent: 4, ref: 1, parentIndex: 2, directParent: '- list' },
    ]
    const tracker = new DiffContextTracker({
      prevComparable,
      currComparable,
      prevToCurrUnchanged: new Map([[0, 0], [1, 1]]),
      pairedPrevToCurr: new Map(),
      currUniqueRefIdx: new Map([[1, 3]]),
      effectiveRemovedAll: new Set([2]),
    })
    const out: string[] = []
    tracker.ensureAncestors(2, 'prev', out)
    out.push('-     - button #1 "A"')
    tracker.recordRemoved(2)
    tracker.ensureAncestors(3, 'curr', out)
    out.push('+     - button #1 "A"')
    tracker.recordAdded(3, false)

    expect(out).toEqual([
      '  - main "根"',
      '    - list',
      '-     - button #1 "A"',
      '    - list',
      '+     - button #1 "A"',
    ])
  })

  it('DiffContextTracker 隔离 fromRemoved：已删除父行压栈后不满足 curr 侧祖先匹配', () => {
    const prevComparable = [
      { line: '- list', trimmed: '- list', indent: 0, ref: null, parentIndex: -1, directParent: '' },
      { line: '  - listitem "a"', trimmed: '- listitem "a"', indent: 2, ref: null, parentIndex: 0, directParent: '- list' },
    ]
    const currComparable = [
      { line: '- list', trimmed: '- list', indent: 0, ref: null, parentIndex: -1, directParent: '' },
      { line: '  - listitem "c"', trimmed: '- listitem "c"', indent: 2, ref: null, parentIndex: 0, directParent: '- list' },
    ]
    const tracker = new DiffContextTracker({
      prevComparable,
      currComparable,
      prevToCurrUnchanged: new Map(),
      pairedPrevToCurr: new Map(),
      currUniqueRefIdx: new Map(),
      effectiveRemovedAll: new Set([0, 1]),
    })
    const out: string[] = []
    out.push('- - list')
    tracker.recordRemoved(0)
    tracker.ensureAncestors(1, 'curr', out)
    out.push('+   - listitem "c"')
    tracker.recordAdded(1, true)

    expect(out).toEqual(['- - list', '  - list', '+   - listitem "c"'])
  })

  it('DiffContextTracker 跳过纯新增外层包装容器的上下文重复输出，同时保留逻辑栈位避免内层祖先重复', () => {
    const prevComparable = [
      { line: '- main "根"', trimmed: '- main "根"', indent: 0, ref: null, parentIndex: -1, directParent: '' },
      { line: '  - group "卡片"', trimmed: '- group "卡片"', indent: 2, ref: null, parentIndex: 0, directParent: '- main "根"' },
      { line: '    - button #1 "项0"', trimmed: '- button #1 "项0"', indent: 4, ref: 1, parentIndex: 1, directParent: '- group "卡片"' },
    ]
    const currComparable = [
      { line: '- main "根"', trimmed: '- main "根"', indent: 0, ref: null, parentIndex: -1, directParent: '' },
      { line: '  - generic "计算中..."', trimmed: '- generic "计算中..."', indent: 2, ref: null, parentIndex: 0, directParent: '- main "根"' },
      { line: '    - group "卡片"', trimmed: '- group "卡片"', indent: 4, ref: null, parentIndex: 1, directParent: '- generic "计算中..."' },
      { line: '      - button #1 [pressed] "项0"', trimmed: '- button #1 [pressed] "项0"', indent: 6, ref: 1, parentIndex: 2, directParent: '- group "卡片"' },
      { line: '      - button #2 [pressed] "项1"', trimmed: '- button #2 [pressed] "项1"', indent: 6, ref: 2, parentIndex: 2, directParent: '- group "卡片"' },
    ]
    const tracker = new DiffContextTracker({
      prevComparable,
      currComparable,
      prevToCurrUnchanged: new Map([[0, 0]]),
      pairedPrevToCurr: new Map(),
      currUniqueRefIdx: new Map([[1, 3], [2, 4]]),
      effectiveRemovedAll: new Set([2]),
    })
    const out: string[] = []
    tracker.ensureAncestors(1, 'curr', out)
    out.push('+   - generic "计算中..."')
    tracker.recordAdded(1, true)
    // 输出旧缩进的 - #1，弹出 generic 栈位
    tracker.ensureAncestors(2, 'prev', out)
    out.push('-     - button #1 "项0"')
    tracker.recordRemoved(2)
    // 切回 curr 侧输出 + #1、+ #2：不得再打印 `    - generic "计算中..."`，且 group "卡片" 仅打印 1 次
    tracker.ensureAncestors(3, 'curr', out)
    out.push('+       - button #1 [pressed] "项0"')
    tracker.recordAdded(3, false)
    tracker.ensureAncestors(4, 'curr', out)
    out.push('+       - button #2 [pressed] "项1"')
    tracker.recordAdded(4, false)

    expect(out).toEqual([
      '  - main "根"',
      '+   - generic "计算中..."',
      '    - group "卡片"',
      '-     - button #1 "项0"',
      '      - group "卡片"',
      '+       - button #1 [pressed] "项0"',
      '+       - button #2 [pressed] "项1"',
    ])
  })
})
