import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildA11yTree } from '../../page-tools/a11y/build'
import { ElementRefAllocator } from '../../page-tools/a11y/ref-allocator'
import { NO_CHANGES_DIFF_TEXT, PageStateCache } from '../../page-tools/page-state-cache'

describe('PageStateCache - 稳定编号下的结构化增量 Diff 与熔断保护', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('复现：页面上方插入一个元素导致 401 行级联偏移使 diff 膨胀至整页 2.1 倍 —— 稳定编号下仅输出实际变更行', () => {
    const allocator = new ElementRefAllocator()
    const cache = new PageStateCache()
    const url = 'https://console.example.com/products'

    const container = document.createElement('div')
    for (let i = 0; i <= 400; i++) {
      const btn = document.createElement('button')
      btn.textContent = `product-${i} 包年包月`
      container.appendChild(btn)
    }
    document.body.appendChild(container)

    // 1. 首次快照：返回 full, rev = 1
    const tree1 = buildA11yTree(container, { refAllocator: allocator })
    const res1 = cache.update(url, tree1.yaml)
    expect(res1.kind).toBe('full')
    expect(res1.rev).toBe(1)
    expect(res1.baseRev).toBeUndefined()

    // 2. 在首个节点前插入筛选按钮，并将 #10 改为「按需计费」
    const filterBtn = document.createElement('button')
    filterBtn.textContent = '筛选标签-A'
    container.insertBefore(filterBtn, container.firstChild)
    const btn10 = allocator // 确认原 #10 对应 DOM 按钮（当前位于 children[11]）
    void btn10
    ;(container.children[11] as HTMLButtonElement).textContent = 'product-10 按需计费'

    const tree2 = buildA11yTree(container, { refAllocator: allocator })
    const res2 = cache.update(url, tree2.yaml)

    expect(res2.kind).toBe('diff')
    expect(res2.rev).toBe(2)
    expect(res2.baseRev).toBe(1)
    expect(res2.addedLines).toBe(2)
    expect(res2.removedLines).toBe(1)
    expect(res2.diffText).toBe(
      [
        '+ - button #401 "筛选标签-A"',
        '- - button #10 "product-10 包年包月"',
        '+ - button #10 "product-10 按需计费"',
      ].join('\n'),
    )
    // diff 字符数远小于整页树（< 2%），彻底消除 2.1x 体积倒挂
    expect(res2.diffText.length).toBeLessThan(tree2.yaml.length * 0.05)
  })

  it('同一变更 Hunk 内多个元素同时更新时，按相同 #ref 将 `- 旧行` 与 `+ 新行` 就近成对输出', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/form'

    const yaml1 = [
      '```yaml',
      '- heading "实例配置"',
      '- generic #9 "限时优惠提示"',
      '- checkbox #10 "自动续费"',
      '- checkbox #11 "开通监控"',
      '- checkbox #12 "安全加固"',
      '- button #13 "立即购买"',
      '- link #14 "计费说明"',
      '- link #15 "服务协议"',
      '- link #16 "退订规则"',
      '- link #17 "常见问题"',
      '```',
    ].join('\n')

    const yaml2 = [
      '```yaml',
      '- heading "实例配置"',
      '- checkbox #10 [checked] "自动续费"',
      '- checkbox #11 [checked] "开通监控"',
      '- checkbox #12 [checked] "安全加固"',
      '- button #18 "领取代金券"',
      '- button #13 "立即购买"',
      '- link #14 "计费说明"',
      '- link #15 "服务协议"',
      '- link #16 "退订规则"',
      '- link #17 "常见问题"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const diff = cache.update(url, yaml2)

    expect(diff.kind).toBe('diff')
    expect(diff.diffText).toBe(
      [
        '- - generic #9 "限时优惠提示"',
        '- - checkbox #10 "自动续费"',
        '+ - checkbox #10 [checked] "自动续费"',
        '- - checkbox #11 "开通监控"',
        '+ - checkbox #11 [checked] "开通监控"',
        '- - checkbox #12 "安全加固"',
        '+ - checkbox #12 [checked] "安全加固"',
        '+ - button #18 "领取代金券"',
      ].join('\n'),
    )
  })

  it('深层嵌套节点变更时自动补充最小父级缩进锚点，且同一父级下多处变更不重复输出祖先上下文', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/ecs'

    const yaml1 = [
      '```yaml',
      '- navigation "侧边导航"',
      '  - link #0 "总览"',
      '  - link #1 "安全组"',
      '  - link #2 "弹性公网 IP"',
      '  - link #3 "云硬盘"',
      '- main "主内容区"',
      '  - region "规格选择"',
      '    - button #4 "2核4G"',
      '    - button #5 "4核8G"',
      '    - button #6 "8核16G"',
      '    - button #7 "16核32G"',
      '```',
    ].join('\n')

    const yaml2 = [
      '```yaml',
      '- navigation "侧边导航"',
      '  - link #0 "总览"',
      '  - link #1 "安全组"',
      '  - link #2 "弹性公网 IP"',
      '  - link #3 "云硬盘"',
      '- main "主内容区"',
      '  - region "规格选择"',
      '    - button #4 [selected] "2核4G"',
      '    - button #5 "4核8G"',
      '    - button #6 "8核16G"',
      '    - button #7 [disabled] "16核32G"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const diff = cache.update(url, yaml2)

    expect(diff.kind).toBe('diff')
    expect(diff.diffText).toBe(
      [
        '  - main "主内容区"',
        '    - region "规格选择"',
        '-     - button #4 "2核4G"',
        '+     - button #4 [selected] "2核4G"',
        '-     - button #7 "16核32G"',
        '+     - button #7 [disabled] "16核32G"',
      ].join('\n'),
    )
  })

  it('当变化行数超过一半时，自动熔断回退整页树（kind = full, fullReason = diff_too_large，且字符长度未超阈值）', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/dashboard'

    // 让未变更行足够长，确保 3 行变更生成的 diff 字符数远低于整页 YAML 长度，严格隔离验证行比例阈值（> 50%）
    const longUnchanged = `- button #0 "${'稳定长描述文案'.repeat(25)}"`
    const yaml1 = [
      '```yaml',
      longUnchanged,
      '- button #1 "A1"',
      '- button #2 "A2"',
      '- button #3 "A3"',
      '```',
    ].join('\n')

    // 4 行中有 3 行（75% > 50%）发生变化，但 diff 字符数（~110）远小于整页 YAML（~260）
    const yaml2 = [
      '```yaml',
      longUnchanged,
      '- button #10 "B1"',
      '- button #11 "B2"',
      '- button #12 "B3"',
      '```',
    ].join('\n')

    const r1 = cache.update(url, yaml1)
    expect(r1).toMatchObject({ kind: 'full', rev: 1, fullReason: 'initial' })

    const r2 = cache.update(url, yaml2)
    expect(r2.kind).toBe('full')
    expect(r2.fullReason).toBe('diff_too_large')
    expect(r2.rev).toBe(2)
    expect(r2.baseRev).toBeUndefined()
  })

  it('当变更行数未超半数但 diff 文本字符长度 >= 整页 YAML 长度（体积倒挂）时，同样触发熔断回退整页树', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/compact'

    // 4 行中删除了 2 行超长旧描述，新增 1 行短文本：max(1,2)/4 = 0.5 未超行数比，但旧行过长使 diff 字符体积超整页 80%
    const longDesc = '这是一段非常长的历史告警详情描述文案'.repeat(8)
    const yaml1 = [
      '```yaml',
      '- button #0 "保留项A"',
      '- button #1 "保留项B"',
      `- generic "${longDesc}-1"`,
      `- generic "${longDesc}-2"`,
      '```',
    ].join('\n')

    const yaml2 = [
      '```yaml',
      '- button #0 "保留项A"',
      '- button #1 "保留项B"',
      '- generic "已清空"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)
    expect(r2.kind).toBe('full')
    expect(r2.fullReason).toBe('diff_too_large')
  })

  it('页面无变化时返回 kind = diff 与明确注释占位，URL 变化、forceFull 与 reset() 均正确维护 rev 链', () => {
    const cache = new PageStateCache()
    const yaml = '```yaml\n- button #0 "提交"\n- button #1 "取消"\n- button #2 "帮助"\n```'

    const r1 = cache.update('https://example.com/a', yaml)
    expect(r1).toMatchObject({ kind: 'full', rev: 1, fullReason: 'initial' })

    const r2 = cache.update('https://example.com/a', yaml)
    expect(r2).toMatchObject({
      kind: 'diff',
      rev: 2,
      baseRev: 1,
      addedLines: 0,
      removedLines: 0,
      diffText: NO_CHANGES_DIFF_TEXT,
    })

    // 宿主折叠历史 diff 链后显式传 forceFull: true
    const r3 = cache.update('https://example.com/a', yaml, { forceFull: true })
    expect(r3).toMatchObject({ kind: 'full', rev: 3, fullReason: 'forced' })
    expect(r3.baseRev).toBeUndefined()

    // URL 变化触发全量刷新
    const r4 = cache.update('https://example.com/b', yaml)
    expect(r4).toMatchObject({ kind: 'full', rev: 4, fullReason: 'url_changed' })

    // 会话重置后 rev 重新从 1 起步
    cache.reset()
    expect(cache.getCurrentRev()).toBe(0)
    const r5 = cache.update('https://example.com/b', yaml)
    expect(r5).toMatchObject({ kind: 'full', rev: 1, fullReason: 'initial' })
  })

  it('复现：紧邻 Hunk 中刚作为 + 行输出的父节点不应再次被重复打印为祖先上下文锚点', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/images'

    const yaml1 = [
      '```yaml',
      '- main "主内容区"',
      '  - generic "公共镜像"',
      '    - generic #1 "Huawei Cloud EulerOS"',
      '    - generic #2 "CentOS"',
      '    - generic #3 "Ubuntu"',
      '    - generic #4 "Debian"',
      '    - generic #5 "openEuler"',
      '    - generic #6 "AlmaLinux"',
      '    - generic #7',
      '      - region "SUSE"',
      '        - region #8 "收费"',
      '```',
    ].join('\n')

    const yaml2 = [
      '```yaml',
      '- main "主内容区"',
      '  - generic "公共镜像"',
      '    - generic #1 "Huawei Cloud EulerOS"',
      '    - generic #2 "CentOS"',
      '    - generic #3 "Ubuntu"',
      '    - generic #4 "Debian"',
      '    - generic #5 "openEuler"',
      '    - generic #6 "AlmaLinux"',
      '    - generic #9',
      '      - region "SUSE"',
      '        - region #10 "收费"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    // #9 已作为 `+ ` 行输出，后续 #10 变更时不得再把 `#9` 作为 `  ` 祖先上下文重复打印一遍
    const lines = r2.diffText.split('\n')
    expect(lines.filter((l) => l.includes('generic #9'))).toHaveLength(1)
  })

  it('复现：外层容器因临时出现「计算中...」停止穿透导致下方子树整体缩进 +2 空格 —— 忽略纯缩进平移，仅输出新增外层容器行', () => {
    const cache = new PageStateCache()
    const url = 'https://console.huaweicloud.com/ecm/#/ecs/create/simple'

    const bodyLines = Array.from({ length: 30 }, (_, i) => `      - button #${i} "规格选项-${i}"`)
    const yaml1 = [
      '```yaml',
      '- main "主内容区"',
      '  - region "页面内容"',
      '    - region "页面正文"',
      ...bodyLines,
      '```',
    ].join('\n')

    // 外层多了一层 generic "计算中..."，下方 32 行内容一字未变，仅整体多缩进 2 空格
    const shiftedLines = [
      '    - region "页面内容"',
      '      - region "页面正文"',
      ...bodyLines.map((l) => `  ${l}`),
    ]
    const yaml2 = [
      '```yaml',
      '- main "主内容区"',
      '  - generic "计算中... 立即购买"',
      ...shiftedLines,
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    // 下方 31 行未变更按钮（directParent 未变）全部跳过，仅输出新增外层包装行与直接挂载其下的首层容器
    expect(r2.diffText).toContain('+   - generic "计算中... 立即购买"')
    expect(r2.diffText).not.toContain('规格选项-0')
    expect(r2.diffText).not.toContain('规格选项-29')
  })

  it('复现：节点文案不变但真实父级层级变更（从容器内提升至顶层）时必须输出差异而非被忽略', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/nesting'

    const yaml1 = [
      '```yaml',
      '- main "主内容区"',
      '  - button #0 "项0"',
      '  - button #1 "项1"',
      '  - button #2 "项2"',
      '  - button #3 "项3"',
      '  - region "支付区"',
      '    - button #4 "Pay"',
      '  - button #5 "项5"',
      '  - button #6 "项6"',
      '```',
    ].join('\n')

    // #4 保持相对位置与文本不变，但从 region "支付区" 提升到顶层
    const yaml2 = [
      '```yaml',
      '- main "主内容区"',
      '  - button #0 "项0"',
      '  - button #1 "项1"',
      '  - button #2 "项2"',
      '  - button #3 "项3"',
      '  - region "支付区"',
      '- button #4 "Pay"',
      '  - button #5 "项5"',
      '  - button #6 "项6"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.diffText).toContain('  - region "支付区"')
    expect(r2.diffText).toContain('-     - button #4 "Pay"')
    expect(r2.diffText).toContain('+ - button #4 "Pay"')
  })

  it('复现：混合 Hunk 中嵌套删除行被顶层新增行替换时，仍保留旧父级祖先锚点', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/billing'

    const yaml1 = [
      '```yaml',
      '- main "主内容区"',
      '  - button #0 "概览"',
      '  - button #1 "订单"',
      '  - button #2 "发票"',
      '  - button #3 "预算"',
      '  - region "Billing"',
      '    - generic "Unavailable"',
      '  - button #4 "帮助"',
      '  - button #5 "工单"',
      '```',
    ].join('\n')

    // Billing 下的 Unavailable 被替换为顶层 Summary 标题（同一混合 Hunk）
    const yaml2 = [
      '```yaml',
      '- main "主内容区"',
      '  - button #0 "概览"',
      '  - button #1 "订单"',
      '  - button #2 "发票"',
      '  - button #3 "预算"',
      '  - region "Billing"',
      '- heading "Summary"',
      '  - button #4 "帮助"',
      '  - button #5 "工单"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.diffText).toContain('  - region "Billing"')
    expect(r2.diffText).toContain('-     - generic "Unavailable"')
    expect(r2.diffText).toContain('+ - heading "Summary"')
  })

  it('复现：父节点先经同 #ref 配对更新、后续 Hunk 又纯删除其子节点时，不应重复输出旧父节点祖先锚点', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/parent-dedup'

    const yaml1 = [
      '```yaml',
      '- main "主内容区"',
      '  - button #1 "项1"',
      '  - button #2 "项2"',
      '  - button #3 "项3"',
      '  - button #4 "项4"',
      '  - generic #10 "旧分组名"',
      '    - button #11 "保留子项"',
      '    - button #12 "待删除子项"',
      '  - button #5 "项5"',
      '  - button #6 "项6"',
      '```',
    ].join('\n')

    const yaml2 = [
      '```yaml',
      '- main "主内容区"',
      '  - button #1 "项1"',
      '  - button #2 "项2"',
      '  - button #3 "项3"',
      '  - button #4 "项4"',
      '  - generic #10 "新分组名"',
      '    - button #11 "保留子项"',
      '  - button #5 "项5"',
      '  - button #6 "项6"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    const oldParentLines = r2.diffText.split('\n').filter((l) => l.includes('generic #10 "旧分组名"'))
    expect(oldParentLines).toHaveLength(1)
  })

  it('复现：父节点文本变化（如 region "购物车 (2)" -> "购物车 (3)"）时，下方 20 个未变更子节点不应输出相同内容的 -/+ 对也不应触发熔断', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/cart'

    const children = Array.from({ length: 20 }, (_, i) => `  - button #${i + 1} "商品-${i + 1}"`)
    const yaml1 = ['```yaml', '- region "购物车 (2)"', ...children, '```'].join('\n')
    const yaml2 = ['```yaml', '- region "购物车 (3)"', ...children, '```'].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.addedLines).toBe(1)
    expect(r2.removedLines).toBe(1)
    expect(r2.diffText).toBe(['- - region "购物车 (2)"', '+ - region "购物车 (3)"'].join('\n'))
  })

  it('复现：包装容器下直接挂 30 个按钮发生缩进平移时，仅输出新增包装行而不触发熔断', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/direct-wrapper'

    const btns = Array.from({ length: 30 }, (_, i) => `  - button #${i} "规格-${i}"`)
    const yaml1 = ['```yaml', '- main "主内容区"', ...btns, '```'].join('\n')
    const yaml2 = [
      '```yaml',
      '- main "主内容区"',
      '  - generic "计算中..."',
      ...btns.map((l) => `  ${l}`),
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.addedLines).toBe(1)
    expect(r2.removedLines).toBe(0)
    expect(r2.diffText).toBe(['  - main "主内容区"', '+   - generic "计算中..."'].join('\n'))
  })

  it('复现：同父节点改名且子节点重排（A,B,C -> C,A,B）时，不得抵消被移动的节点 C', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/reorder'

    const padding = Array.from({ length: 12 }, (_, i) => `- button #${i + 10} "静态项-${i}"`)
    const yaml1 = [
      '```yaml',
      ...padding,
      '- list "L"',
      '  - listitem "A"',
      '  - listitem "B"',
      '  - listitem "C"',
      '```',
    ].join('\n')
    const yaml2 = [
      '```yaml',
      ...padding,
      '- list "L2"',
      '  - listitem "C"',
      '  - listitem "A"',
      '  - listitem "B"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.diffText).toContain('-   - listitem "C"')
    expect(r2.diffText).toContain('+   - listitem "C"')
  })

  it('复现：两个父容器同时改名且内部按钮跨父交换（Billing/Shipping）时，不得误抵消跨父移动的按钮', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/cross-parent-swap'

    const padding = Array.from({ length: 16 }, (_, i) => `- button #${i + 10} "常驻项-${i}"`)
    const yaml1 = [
      '```yaml',
      ...padding,
      '- region "Billing"',
      '  - button #1 "Pay"',
      '- region "Shipping"',
      '  - button #2 "Track"',
      '```',
    ].join('\n')
    const yaml2 = [
      '```yaml',
      ...padding,
      '- region "Billing (1)"',
      '  - button #2 "Track"',
      '- region "Shipping (1)"',
      '  - button #1 "Pay"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.diffText).toContain('button #1 "Pay"')
    expect(r2.diffText).toContain('button #2 "Track"')
  })

  it('复现：已有带 #ref 父节点改名并将外部兄弟节点移入其下时，不得误判为新插入 Wrapper 而吞掉移动', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/existing-parent-wrap-in'

    const padding = Array.from({ length: 16 }, (_, i) => `- button #${i + 30} "常驻项-${i}"`)
    const yaml1 = [
      '```yaml',
      ...padding,
      '- region #10 "Billing"',
      '- button #1 "Pay"',
      '```',
    ].join('\n')
    const yaml2 = [
      '```yaml',
      ...padding,
      '- region #10 "Billing (Updated)"',
      '  - button #1 "Pay"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.diffText).toContain('- - button #1 "Pay"')
    expect(r2.diffText).toContain('+   - button #1 "Pay"')
  })

  it('复现：已有带 #ref 父节点改名并将内部子节点移出至同级时，不得误判为移除 Wrapper 而吞掉移动', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/existing-parent-unwrap-out'

    const padding = Array.from({ length: 16 }, (_, i) => `- button #${i + 30} "常驻项-${i}"`)
    const yaml1 = [
      '```yaml',
      ...padding,
      '- region #10 "Billing"',
      '  - button #1 "Pay"',
      '```',
    ].join('\n')
    const yaml2 = [
      '```yaml',
      ...padding,
      '- region #10 "Billing (Updated)"',
      '- button #1 "Pay"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.diffText).toContain('-   - button #1 "Pay"')
    expect(r2.diffText).toContain('+ - button #1 "Pay"')
  })

  it('复现：两个带 #ref 父容器互换位置且子节点跨父移动进入相同槽位时，不得误抵消跨父移动', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/referenced-parent-swap'

    const padding = Array.from({ length: 16 }, (_, i) => `- button #${i + 30} "常驻项-${i}"`)
    const yaml1 = [
      '```yaml',
      ...padding,
      '- region #10 "Billing"',
      '  - button #1 "Pay"',
      '- region #20 "Shipping"',
      '  - button #2 "Track"',
      '```',
    ].join('\n')
    const yaml2 = [
      '```yaml',
      ...padding,
      '- region #20 "Shipping"',
      '  - button #1 "Pay"',
      '- region #10 "Billing"',
      '  - button #2 "Track"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.diffText).toContain('button #1 "Pay"')
    expect(r2.diffText).toContain('button #2 "Track"')
  })

  it('复现：改名父节点下的直接子节点带子树（如 20 件购物车商品）时，全局抵消不输出内容相同的成对行也不熔断', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/cart-subtree'

    const items = Array.from({ length: 20 }, (_, i) => [
      `  - listitem "商品-${i}"`,
      `    - button #${i} "删除"`,
    ]).flat()

    const yaml1 = ['```yaml', '- region "购物车 (2)"', ...items, '```'].join('\n')
    const yaml2 = ['```yaml', '- region "购物车 (3)"', ...items, '```'].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.addedLines).toBe(1)
    expect(r2.removedLines).toBe(1)
    expect(r2.diffText).toContain('- - region "购物车 (2)"')
    expect(r2.diffText).toContain('+ - region "购物车 (3)"')
    expect(r2.diffText).not.toContain('商品-0')
    expect(r2.diffText).not.toContain('商品-19')
  })

  it('复现：包装层插入与移除时，30 张带子树的直接子卡片跨多个 hunk 也能全局抵消，仅输出 1 行包装层变更', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/wrapper-subtree'

    const cards = Array.from({ length: 30 }, (_, i) => [
      `  - group "卡片-${i}"`,
      `    - button #${i} "购买-${i}"`,
    ]).flat()

    const yamlUnwrapped = ['```yaml', '- main "主内容区"', ...cards, '```'].join('\n')
    const yamlWrapped = [
      '```yaml',
      '- main "主内容区"',
      '  - generic "计算中..."',
      ...cards.map((l) => `  ${l}`),
      '```',
    ].join('\n')

    // 包装层插入
    cache.update(url, yamlUnwrapped)
    const rWrap = cache.update(url, yamlWrapped)
    expect(rWrap.kind).toBe('diff')
    expect(rWrap.addedLines).toBe(1)
    expect(rWrap.removedLines).toBe(0)
    expect(rWrap.diffText).toContain('+   - generic "计算中..."')
    expect(rWrap.diffText).not.toContain('卡片-0')
    expect(rWrap.diffText).not.toContain('卡片-29')

    // 包装层移除（对称）
    const rUnwrap = cache.update(url, yamlUnwrapped)
    expect(rUnwrap.kind).toBe('diff')
    expect(rUnwrap.addedLines).toBe(0)
    expect(rUnwrap.removedLines).toBe(1)
    expect(rUnwrap.diffText).toContain('-   - generic "计算中..."')
    expect(rUnwrap.diffText).not.toContain('卡片-0')
    expect(rUnwrap.diffText).not.toContain('卡片-29')
  })

  it('复现：同 hunk 删除容器 X、改名容器 Y 并把 #5 从 X 移入 Y 时，不按序号错配：#6 被抵消且 #5 跨父移动完整保留', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/delete-and-rename-parent'

    const padding = Array.from({ length: 20 }, (_, i) => `- button #${i + 20} "静态项-${i}"`)
    const yaml1 = [
      '```yaml',
      ...padding,
      '- region "X"',
      '  - button #5 "转移"',
      '- region "Y (2)"',
      '  - button #6 "保留"',
      '```',
    ].join('\n')
    const yaml2 = [
      '```yaml',
      ...padding,
      '- region "Y (3)"',
      '  - button #5 "转移"',
      '  - button #6 "保留"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.diffText).toContain('- - region "X"')
    expect(r2.diffText).toContain('- - region "Y (2)"')
    expect(r2.diffText).toContain('+ - region "Y (3)"')
    // #5 从 X 移入 Y (3)，必须完整保留
    expect(r2.diffText).toContain('-   - button #5 "转移"')
    expect(r2.diffText).toContain('+   - button #5 "转移"')
    // #6 留在改名后的 Y 内未变，不得输出内容完全相同的 -/+ 成对行
    expect(r2.diffText).not.toContain('button #6 "保留"')
  })

  it('复现：混合 hunk 跨多个父节点（A > ga > #1 与 B->B2 > gb > #2）时，严格按文档顺序输出并补全中间层祖先 gb', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/multi-parent-order'

    const padding = Array.from({ length: 20 }, (_, i) => `- button #${i + 20} "常驻-${i}"`)
    const yaml1 = [
      '```yaml',
      ...padding,
      '- region "A"',
      '  - group "ga"',
      '    - button #1 "x"',
      '- region "B"',
      '  - group "gb"',
      '    - button #2 "y"',
      '```',
    ].join('\n')
    const yaml2 = [
      '```yaml',
      ...padding,
      '- region "A"',
      '  - group "ga"',
      '    - button #1 "x2"',
      '- region "B2"',
      '  - group "gb"',
      '    - button #2 "y2"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    const lines = r2.diffText.split('\n')
    const idxA = lines.findIndex((l) => l.includes('region "A"'))
    const idxGa = lines.findIndex((l) => l.includes('group "ga"'))
    const idxBtn1 = lines.findIndex((l) => l.includes('button #1 "x2"'))
    const idxB = lines.findIndex((l) => l.includes('- - region "B"'))
    const idxB2 = lines.findIndex((l) => l.includes('+ - region "B2"'))
    const idxGb = lines.findIndex((l) => l.includes('  - group "gb"') && !l.startsWith('-') && !l.startsWith('+'))
    const idxBtn2 = lines.findIndex((l) => l.includes('button #2 "y2"'))

    expect(idxA).toBeGreaterThanOrEqual(0)
    expect(idxGa).toBeGreaterThan(idxA)
    expect(idxBtn1).toBeGreaterThan(idxGa)
    expect(idxB).toBeGreaterThan(idxBtn1)
    expect(idxB2).toBeGreaterThan(idxB)
    expect(idxGb).toBeGreaterThan(idxB2)
    expect(idxBtn2).toBeGreaterThan(idxGb)
  })

  it('复现：5000 行大树整页重绘通过 O(N) 低重合预判快速熔断，避免跑满 Myers 阻塞主线程', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/large-redraw'

    const makeTree = (prefix: string, refBase: number) => {
      const lines = ['```yaml', `- main "${prefix}-主内容"`]
      let ref = refBase
      for (let g = 0; g < 384; g++) {
        lines.push(`  - region "${prefix}-区-${g}"`)
        lines.push(`    - group "${prefix}-组-${g}"`)
        for (let k = 0; k < 11; k++) {
          lines.push(`      - button #${ref++} "${prefix}-按钮-${g}-${k}"`)
        }
      }
      lines.push('```')
      return lines.join('\n')
    }

    const yaml1 = makeTree('旧页', 0)
    const yaml2 = makeTree('新页', 10000)

    cache.update(url, yaml1)
    const t0 = performance.now()
    const r2 = cache.update(url, yaml2)
    const elapsed = performance.now() - t0

    expect(r2.kind).toBe('full')
    expect(r2.fullReason).toBe('diff_too_large')
    expect(elapsed).toBeLessThan(200)
  })

  it('复现：无 #ref 父节点行内拼装名称变化（如 listitem "订单-3 运行中" → "订单-3 已停止"）与无名称容器加 token 时，正确配对抵消相同子节点且 - 排在 + 之前', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/inline-lifted-parent-rename'

    const baseRows = Array.from({ length: 12 }, (_, i) => [
      `  - listitem "订单-${i} 运行中"`,
      `    - button #${i * 2} "详情"`,
      `    - button #${i * 2 + 1} "停止"`,
    ]).flat()

    const yaml1 = [
      '```yaml',
      '- list "订单列表"',
      ...baseRows,
      '  - row',
      '    - button #90 "操作A"',
      '    - button #91 "操作B"',
      '```',
    ].join('\n')

    const updatedRows = baseRows.map((line) =>
      line === '  - listitem "订单-3 运行中"' ? '  - listitem "订单-3 已停止"' : line,
    )
    const yaml2 = [
      '```yaml',
      '- list "订单列表"',
      ...updatedRows,
      '  - row [selected]',
      '    - button #90 "操作A"',
      '    - button #91 "操作B"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.addedLines).toBe(2)
    expect(r2.removedLines).toBe(2)
    expect(r2.diffText).toContain('-   - listitem "订单-3 运行中"')
    expect(r2.diffText).toContain('+   - listitem "订单-3 已停止"')
    expect(r2.diffText).toContain('-   - row')
    expect(r2.diffText).toContain('+   - row [selected]')
    // 相同子节点全部被抵消
    expect(r2.diffText).not.toContain('button #6')
    expect(r2.diffText).not.toContain('button #7')
    expect(r2.diffText).not.toContain('button #90')
    expect(r2.diffText).not.toContain('button #91')
  })

  it('复现：无配对点的纯删除+新增 hunk 中，删除行（-）始终排在新增行（+）之前', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/unpaired-order'

    const padding = Array.from({ length: 10 }, (_, i) => `- button #${i + 10} "常驻-${i}"`)
    const yaml1 = ['```yaml', '- button #1 "旧动作"', ...padding, '```'].join('\n')
    const yaml2 = ['```yaml', '- button #2 "新动作"', ...padding, '```'].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    const lines = r2.diffText.split('\n')
    const remIdx = lines.findIndex((l) => l.startsWith('- ') && l.includes('#1'))
    const addIdx = lines.findIndex((l) => l.startsWith('+ ') && l.includes('#2'))
    expect(remIdx).toBeGreaterThanOrEqual(0)
    expect(addIdx).toBeGreaterThan(remIdx)
  })

  it('复现：包装层抵消场景 A —— 两张同名 group "规格" 卡片，第 1 张 #30 移入第 2 张新出现的 group "已选" 时必须输出跨父移动', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/wrapper-same-name-cards'

    const padding = Array.from({ length: 16 }, (_, i) => `  - button #${i + 100} "填充-${i}"`)
    const yaml1 = [
      '```yaml',
      '- main "配置页"',
      ...padding,
      '  - group "规格"',
      '    - button #30 "2核4G"',
      '    - button #31 "4核8G"',
      '  - group "规格"',
      '    - button #40 "8核16G"',
      '```',
    ].join('\n')

    const yaml2 = [
      '```yaml',
      '- main "配置页"',
      ...padding,
      '  - group "规格"',
      '    - button #31 "4核8G"',
      '  - group "规格"',
      '    - group "已选"',
      '      - button #30 "2核4G"',
      '    - button #40 "8核16G"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.diffText).toContain('-     - button #30 "2核4G"')
    expect(r2.diffText).toContain('+       - button #30 "2核4G"')
  })

  it('复现：包装层抵消场景 B —— 同父级顶层第 1 项 #30 跨位置移入尾部新出现的 group "更多" 时必须输出移动', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/wrapper-cross-position'

    const padding = Array.from({ length: 16 }, (_, i) => `  - button #${i + 100} "顶部填充-${i}"`)
    const yaml1 = [
      '```yaml',
      '- main "表格区"',
      ...padding,
      '  - button #30 "行0"',
      '  - button #31 "行1"',
      '  - button #32 "行2"',
      '  - button #33 "行3"',
      '```',
    ].join('\n')

    const yaml2 = [
      '```yaml',
      '- main "表格区"',
      ...padding,
      '  - button #31 "行1"',
      '  - button #32 "行2"',
      '  - button #33 "行3"',
      '  - group "更多"',
      '    - button #30 "行0"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.diffText).toContain('-   - button #30 "行0"')
    expect(r2.diffText).toContain('+     - button #30 "行0"')
  })

  it('复现：同父级原本已有同级同名 generic "计算中..." 时，新插入同名包装层包住 30 张卡片仍可精确抵消', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/wrapper-existing-sibling-same-name'

    const cards = Array.from({ length: 30 }, (_, i) => [
      `  - group "卡片-${i}"`,
      `    - button #${i} "购买-${i}"`,
    ]).flat()

    const yaml1 = [
      '```yaml',
      '- main "主内容区"',
      '  - generic "计算中..."',
      ...cards,
      '```',
    ].join('\n')
    const yaml2 = [
      '```yaml',
      '- main "主内容区"',
      '  - generic "计算中..."',
      '  - generic "计算中..."',
      ...cards.map((l) => `  ${l}`),
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.addedLines).toBe(1)
    expect(r2.removedLines).toBe(0)
    expect(r2.diffText).toContain('+   - generic "计算中..."')
    expect(r2.diffText).not.toContain('卡片-0')
    expect(r2.diffText).not.toContain('卡片-29')
  })

  it('复现：大树最坏场景（5000 行列表倒序与 5000 行全行改名）通过 maxEditLength 与倒排索引快速回退不阻塞', () => {
    const url = 'https://console.example.com/large-worst-case'

    // 场景 1：5000 行列表整体倒序
    const makeReversedList = (reverse: boolean) => {
      const items = Array.from({ length: 1666 }, (_, idx) => {
        const i = reverse ? 1665 - idx : idx
        return [
          `  - listitem "订单-${i}"`,
          `    - text "金额 ¥${i}"`,
          `    - button #${i} "查看"`,
        ]
      }).flat()
      return ['```yaml', '- list "订单"', ...items, '```'].join('\n')
    }
    const cache1 = new PageStateCache()
    cache1.update(url, makeReversedList(false))
    const t0 = performance.now()
    const rRev = cache1.update(url, makeReversedList(true))
    const elapsedRev = performance.now() - t0
    expect(rRev.kind).toBe('full')
    expect(rRev.fullReason).toBe('diff_too_large')
    expect(elapsedRev).toBeLessThan(400)

    // 场景 2：5000 行所有父行改名（CPU 百分比全量刷新）
    const makeCpuTable = (cpuBase: number) => {
      const rows = Array.from({ length: 1250 }, (_, i) => [
        `  - row "实例-${i} (CPU ${cpuBase + (i % 10)}%)"`,
        `    - cell "华北-北京四"`,
        `    - cell "运行中"`,
        `    - button #${i} "重启"`,
      ]).flat()
      return ['```yaml', '- table "实例列表"', ...rows, '```'].join('\n')
    }
    const cache2 = new PageStateCache()
    cache2.update(url, makeCpuTable(10))
    const t1 = performance.now()
    const rCpu = cache2.update(url, makeCpuTable(50))
    const elapsedCpu = performance.now() - t1
    expect(rCpu.kind).toBe('full')
    expect(rCpu.fullReason).toBe('diff_too_large')
    expect(elapsedCpu).toBeLessThan(400)
  })

  it('复现：已有的无 #ref 容器改不相似名或拆外层包装上移并同时移入/移出按钮时，不得被当成新包装层吞掉移动', () => {
    const url = 'https://console.example.com/existing-unref-container-move'
    const padding = Array.from({ length: 20 }, (_, i) => `  - button #${i + 50} "常驻-${i}"`)

    // 场景 1：容器改不相似名（"待处理" → "已完成"），同时相邻按钮 #2 移入
    const c1 = new PageStateCache()
    c1.update(
      url,
      [
        '```yaml',
        '- main "看板"',
        ...padding,
        '  - group "待处理"',
        '    - button #1 "任务1"',
        '  - button #2 "任务2"',
        '```',
      ].join('\n'),
    )
    const r1 = c1.update(
      url,
      [
        '```yaml',
        '- main "看板"',
        ...padding,
        '  - group "已完成"',
        '    - button #1 "任务1"',
        '    - button #2 "任务2"',
        '```',
      ].join('\n'),
    )
    expect(r1.kind).toBe('diff')
    expect(r1.diffText).toContain('-   - button #2 "任务2"')
    expect(r1.diffText).toContain('+     - button #2 "任务2"')
    expect(r1.diffText).not.toContain('button #1 "任务1"')

    // 场景 2：移除外层包装 "加载层"，同时按钮 #1 移入被释放上移的已有容器 "卡片"
    const c2 = new PageStateCache()
    c2.update(
      url,
      [
        '```yaml',
        '- main "看板"',
        ...padding,
        '  - button #1 "任务1"',
        '  - generic "加载层"',
        '    - group "卡片"',
        '      - button #2 "任务2"',
        '```',
      ].join('\n'),
    )
    const r2 = c2.update(
      url,
      [
        '```yaml',
        '- main "看板"',
        ...padding,
        '  - group "卡片"',
        '    - button #1 "任务1"',
        '    - button #2 "任务2"',
        '```',
      ].join('\n'),
    )
    expect(r2.kind).toBe('diff')
    expect(r2.diffText).toContain('-   - generic "加载层"')
    expect(r2.diffText).toContain('-   - button #1 "任务1"')
    expect(r2.diffText).toContain('+     - button #1 "任务1"')

    // 场景 3（镜像）：容器改不相似名（"已完成" → "待处理"），同时按钮 #2 从容器移出到 main
    const c3 = new PageStateCache()
    c3.update(
      url,
      [
        '```yaml',
        '- main "看板"',
        ...padding,
        '  - group "已完成"',
        '    - button #1 "任务1"',
        '    - button #2 "任务2"',
        '```',
      ].join('\n'),
    )
    const r3 = c3.update(
      url,
      [
        '```yaml',
        '- main "看板"',
        ...padding,
        '  - group "待处理"',
        '    - button #1 "任务1"',
        '  - button #2 "任务2"',
        '```',
      ].join('\n'),
    )
    expect(r3.kind).toBe('diff')
    expect(r3.diffText).toContain('-     - button #2 "任务2"')
    expect(r3.diffText).toContain('+   - button #2 "任务2"')
    expect(r3.diffText).not.toContain('button #1 "任务1"')
  })

  it('复现：元素移入同时改名的父节点（如 listbox #20 "已选 (1)" → "(2)"）时，跨父移动的 + 行前必须补齐新父节点锚点', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/move-into-renamed-parent'
    const padding = Array.from({ length: 20 }, (_, i) => `- button #${i + 50} "常驻-${i}"`)

    const yaml1 = [
      '```yaml',
      ...padding,
      '- group "待选"',
      '  - button #5 "苹果"',
      '- listbox #20 "已选 (1)"',
      '  - button #6 "香蕉"',
      '```',
    ].join('\n')
    const yaml2 = [
      '```yaml',
      ...padding,
      '- group "待选"',
      '- listbox #20 "已选 (2)"',
      '  - button #5 "苹果"',
      '  - button #6 "香蕉"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    const lines = r2.diffText.split('\n')
    const remIdx = lines.findIndex((l) => l === '-   - button #5 "苹果"')
    const addIdx = lines.findIndex((l) => l === '+   - button #5 "苹果"')
    expect(remIdx).toBeGreaterThanOrEqual(0)
    expect(addIdx).toBeGreaterThan(remIdx)
    // - #5 前应为旧父级锚点 group "待选"，+ #5 紧邻前应为新父级 listbox #20 "已选 (2)"（无论是 + 行还是上下文锚点）
    expect(lines[remIdx - 1]).toBe('  - group "待选"')
    expect(lines[addIdx - 1]).toMatch(/^(?:  |\+ )- listbox #20 "已选 \(2\)"$/)
  })

  it('复现：跨父移动遇已删除/已改名旧父节点及多元素同向移动时，绝不将旧父节点作为上下文行输出且父级锚点去重', () => {
    const url = 'https://console.example.com/cross-parent-clean-ancestors'
    const padding = Array.from({ length: 20 }, (_, i) => `- button #${i + 50} "常驻-${i}"`)

    // 场景 1：dialog #30 被删除，其子 #5 移入改名的 listbox #20（绝不输出 `  - dialog #30` 上下文行）
    const c1 = new PageStateCache()
    c1.update(
      url,
      [
        '```yaml',
        ...padding,
        '- dialog #30 "确认"',
        '  - button #5 "确定"',
        '- listbox #20 "已选 (0)"',
        '```',
      ].join('\n'),
    )
    const r1 = c1.update(
      url,
      [
        '```yaml',
        ...padding,
        '- listbox #20 "已选 (1)"',
        '  - button #5 "确定"',
        '```',
      ].join('\n'),
    )
    expect(r1.kind).toBe('diff')
    expect(r1.diffText).not.toContain('  - dialog #30 "确认"')
    expect(r1.diffText).toBe(
      [
        '- - dialog #30 "确认"',
        '-   - button #5 "确定"',
        '- - listbox #20 "已选 (0)"',
        '+ - listbox #20 "已选 (1)"',
        '+   - button #5 "确定"',
      ].join('\n'),
    )

    // 场景 2：旧父节点 group #30 改名（"待选 (1)" → "(0)"），同时 #5 移入改名的 listbox #20（绝不输出旧名上下文行）
    const c2 = new PageStateCache()
    c2.update(
      url,
      [
        '```yaml',
        ...padding,
        '- group #30 "待选 (1)"',
        '  - button #5 "确定"',
        '- listbox #20 "已选 (0)"',
        '```',
      ].join('\n'),
    )
    const r2 = c2.update(
      url,
      [
        '```yaml',
        ...padding,
        '- group #30 "待选 (0)"',
        '- listbox #20 "已选 (1)"',
        '  - button #5 "确定"',
        '```',
      ].join('\n'),
    )
    expect(r2.kind).toBe('diff')
    expect(r2.diffText).not.toContain('  - group #30 "待选 (1)"')
    expect(r2.diffText).toContain('+   - button #5 "确定"')

    // 场景 3：2 个元素 #5/#7 同时从 group "待选" 移入改名的 listbox #20，父级锚点严格去重（各自仅出现 1 次）
    const c3 = new PageStateCache()
    c3.update(
      url,
      [
        '```yaml',
        ...padding,
        '- group "待选"',
        '  - button #5 "苹果"',
        '  - button #7 "梨"',
        '- listbox #20 "已选 (1)"',
        '  - button #6 "香蕉"',
        '```',
      ].join('\n'),
    )
    const r3 = c3.update(
      url,
      [
        '```yaml',
        ...padding,
        '- group "待选"',
        '- listbox #20 "已选 (3)"',
        '  - button #5 "苹果"',
        '  - button #7 "梨"',
        '  - button #6 "香蕉"',
        '```',
      ].join('\n'),
    )
    expect(r3.kind).toBe('diff')
    const groupAnchorCount = r3.diffText
      .split('\n')
      .filter((l) => l === '  - group "待选"').length
    const listboxAnchorCount = r3.diffText
      .split('\n')
      .filter((l) => l === '  - listbox #20 "已选 (3)"').length
    expect(groupAnchorCount).toBe(1)
    expect(listboxAnchorCount).toBe(0)
    expect(r3.diffText).toContain('+ - listbox #20 "已选 (3)"\n+   - button #5 "苹果"\n+   - button #7 "梨"')
  })

  it('复现：页面别处删除同名节点（侧栏移除 generic "加载中"）时，另一区域的新包装层（列表包 30 张卡片）仍精确抵消', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/wrapper-same-name-elsewhere'
    const cards = Array.from({ length: 30 }, (_, i) => [
      `    - group "卡片-${i}"`,
      `      - button #${i} "购买-${i}"`,
    ]).flat()

    const yaml1 = [
      '```yaml',
      '- main "主内容"',
      '  - region "侧栏"',
      '    - generic "加载中"',
      '    - button #100 "刷新"',
      '  - region "列表"',
      ...cards,
      '```',
    ].join('\n')
    const yaml2 = [
      '```yaml',
      '- main "主内容"',
      '  - region "侧栏"',
      '    - button #100 "刷新"',
      '  - region "列表"',
      '    - generic "加载中"',
      ...cards.map((l) => `  ${l}`),
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.addedLines).toBe(1)
    expect(r2.removedLines).toBe(1)
    expect(r2.diffText).toContain('-     - generic "加载中"')
    expect(r2.diffText).toContain('+     - generic "加载中"')
    expect(r2.diffText).not.toContain('卡片-0')
  })

  it('复现：单调缩进上下文栈在三类多祖先/跨 hunk/缩进平移场景下绝不丢失内层锚点或错级', () => {
    const url = 'https://console.example.com/ancestor-stack-scenarios'
    const padding = Array.from({ length: 20 }, (_, i) => `  - link #${i + 200} "导航-${i}"`)

    // 场景 1：#7 从 main 移入 region #100，region 内同时删除 #5，+ #7 必须挂在 region #100 下
    const c1 = new PageStateCache()
    c1.update(
      url,
      [
        '```yaml',
        '- main "根"',
        ...padding,
        '  - button #7 "待分配"',
        '  - region #100 "分组"',
        '    - button #5 "旧项"',
        '    - button #6 "保留项"',
        '```',
      ].join('\n'),
    )
    const r1 = c1.update(
      url,
      [
        '```yaml',
        '- main "根"',
        ...padding,
        '  - region #100 "分组"',
        '    - button #6 "保留项"',
        '    - button #7 "待分配"',
        '```',
      ].join('\n'),
    )
    expect(r1.kind).toBe('diff')
    const r1Lines = r1.diffText.split('\n')
    const r1Add7 = r1Lines.indexOf('+     - button #7 "待分配"')
    expect(r1Add7).toBeGreaterThan(0)
    // + #7 上方最近的小缩进祖先必须是 region #100，不能被重出的 main 顶掉
    const nearestParentOfAdd7 = r1Lines
      .slice(0, r1Add7)
      .reverse()
      .find((l) => !l.startsWith('-     ') && !l.startsWith('+     '))
    expect(nearestParentOfAdd7).toContain('region #100 "分组"')

    // 场景 2：带 #ref 的列表计数改名（region #10 "购物车 (2)" → "(1)"），跨保留项删除 #2，- #2 前不被 main 顶掉
    const c2 = new PageStateCache()
    c2.update(
      url,
      [
        '```yaml',
        '- main "根"',
        ...padding,
        '  - region #10 "购物车 (2)"',
        '    - button #1 "商品A"',
        '    - button #2 "商品B"',
        '```',
      ].join('\n'),
    )
    const r2 = c2.update(
      url,
      [
        '```yaml',
        '- main "根"',
        ...padding,
        '  - region #10 "购物车 (1)"',
        '    - button #1 "商品A"',
        '```',
      ].join('\n'),
    )
    expect(r2.kind).toBe('diff')
    const r2Lines = r2.diffText.split('\n')
    const r2Rem2 = r2Lines.indexOf('-     - button #2 "商品B"')
    expect(r2Rem2).toBeGreaterThan(0)
    expect(r2Lines[r2Rem2 - 1]).toContain('region #10 "购物车 (1)"')

    // 场景 3：插入 generic "计算中..." 包住 group "卡片"，同时卡片内 #1 变为 [pressed]，- #1 与 + #1 各自对齐缩进
    const c3 = new PageStateCache()
    c3.update(
      url,
      [
        '```yaml',
        '- main "根"',
        ...padding,
        '  - group "卡片"',
        '    - button #1 "收藏"',
        '    - button #2 "分享"',
        '```',
      ].join('\n'),
    )
    const r3 = c3.update(
      url,
      [
        '```yaml',
        '- main "根"',
        ...padding,
        '  - generic "计算中..."',
        '    - group "卡片"',
        '      - button #1 [pressed] "收藏"',
        '      - button #2 "分享"',
        '```',
      ].join('\n'),
    )
    expect(r3.kind).toBe('diff')
    const r3Lines = r3.diffText.split('\n')
    const rem1Idx = r3Lines.indexOf('-     - button #1 "收藏"')
    const add1Idx = r3Lines.indexOf('+       - button #1 [pressed] "收藏"')
    expect(rem1Idx).toBeGreaterThan(0)
    expect(add1Idx).toBeGreaterThan(rem1Idx)
    // - #1（4 空格）前应挂在 2 空格的 group "卡片" 下；+ #1（6 空格）前应挂在 4 空格的 group "卡片" 下
    expect(r3Lines[rem1Idx - 1]).toBe('    - group "卡片"')
    expect(r3Lines[add1Idx - 1]).toBe('      - group "卡片"')
  })

  it('复现：带 #ref 的交互容器（如 dialog #30）删除且子节点 #5 上移到顶层时，不按无交互包装层折叠，必须输出 #5 移动', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/ref-container-not-wrapper'
    const padding = Array.from({ length: 20 }, (_, i) => `- button #${i + 50} "常驻-${i}"`)

    const yaml1 = [
      '```yaml',
      ...padding,
      '- dialog #30 "确认"',
      '  - button #5 "确定"',
      '```',
    ].join('\n')
    const yaml2 = ['```yaml', ...padding, '- button #5 "确定"', '```'].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.diffText).toContain('- - dialog #30 "确认"')
    expect(r2.diffText).toContain('-   - button #5 "确定"')
    expect(r2.diffText).toContain('+ - button #5 "确定"')
  })

  it('复现：名称含转义引号或带含 ] token 的无 #ref 容器改名时，仍能正确配对并抵消未变化子节点', () => {
    const cache = new PageStateCache()
    const url = 'https://console.example.com/escaped-quote-rename'
    const padding = Array.from({ length: 20 }, (_, i) => `- button #${i + 50} "常驻-${i}"`)

    const yaml1 = [
      '```yaml',
      ...padding,
      '- row [selected] [tooltip="a]b"] "订单 \\"A\\" (2)"',
      '  - button #1 "详情"',
      '  - button #2 "删除"',
      '  - generic "备注信息"',
      '```',
    ].join('\n')
    const yaml2 = [
      '```yaml',
      ...padding,
      '- row [selected] [tooltip="a]b"] "订单 \\"A\\" (3)"',
      '  - button #1 "详情"',
      '  - button #2 "删除"',
      '  - generic "备注信息"',
      '```',
    ].join('\n')

    cache.update(url, yaml1)
    const r2 = cache.update(url, yaml2)

    expect(r2.kind).toBe('diff')
    expect(r2.addedLines).toBe(1)
    expect(r2.removedLines).toBe(1)
    expect(r2.diffText).toContain('- - row [selected] [tooltip="a]b"] "订单 \\"A\\" (2)"')
    expect(r2.diffText).toContain('+ - row [selected] [tooltip="a]b"] "订单 \\"A\\" (3)"')
    expect(r2.diffText).not.toContain('button #1')
    expect(r2.diffText).not.toContain('备注信息')
  })

  it('边界固定：无 #ref 列表直接子节点数超过 maxEditLength/2（约 400）时改名回退整页树，200 个子节点正常输出增量 diff', () => {
    const url = 'https://console.example.com/max-edit-length-boundary'
    const makePage = (childCount: number, listTitle: string, extraChild = false) => {
      const padding = Array.from({ length: 550 }, (_, i) => `- button #${i + 1000} "顶部-${i}"`)
      const children = Array.from({ length: childCount }, (_, i) => `  - button #${i} "项-${i}"`)
      if (extraChild) children.push(`  - button #${childCount} "新增项"`)
      return ['```yaml', ...padding, `- list "${listTitle}"`, ...children, '```'].join('\n')
    }

    // 450 个直接子节点：抵消前 Myers 编辑数 = 900+ > MAX_MYERS_EDIT_LENGTH(800)，快速熔断回退整页树
    const cLarge = new PageStateCache()
    cLarge.update(url, makePage(450, '订单 (450)', false))
    const rLarge = cLarge.update(url, makePage(450, '订单 (451)', true))
    expect(rLarge.kind).toBe('full')
    expect(rLarge.fullReason).toBe('diff_too_large')

    // 200 个直接子节点：抵消前 Myers 编辑数 ~403 <= 800，抵消后精确输出 3 行 diff
    const cMedium = new PageStateCache()
    cMedium.update(url, makePage(200, '订单 (200)', false))
    const rMedium = cMedium.update(url, makePage(200, '订单 (201)', true))
    expect(rMedium.kind).toBe('diff')
    expect(rMedium.addedLines).toBe(2)
    expect(rMedium.removedLines).toBe(1)
  })

  it('不变式校验：确定性伪随机树变更序列（含不相似改名、外层拆包与同步移入/移出）中，kind=diff 绝不丢失真实变更或移动', () => {
    // 确定性 LCG 伪随机数生成器
    let seed = 20261124
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 0x100000000
    }
    const pickInt = (max: number) => Math.floor(nextRand() * max)

    const unrelatedNames = ['待处理', '已完成', '审批中', '归档区', '高优任务', '回收站']

    interface BtnNode {
      ref: number
      label: string
      selected: boolean
    }
    interface GroupNode {
      id: number
      title: string
      outerWrapped: boolean
      innerWrapped: boolean
      items: BtnNode[]
    }

    let nextRef = 0
    // 将顶层按钮穿插在每个分组紧邻之后（betweenItems[g] 位于 groups[g] 紧邻后方），
    // 使同一步不相似改名/拆外层包装时的移入/移出直接落在目标容器的相邻兄弟窗口内
    const makeInitialState = (): { groups: GroupNode[]; betweenItems: BtnNode[][] } => ({
      groups: Array.from({ length: 6 }, (_, g) => ({
        id: g,
        title: `分组-${g} (4)`,
        outerWrapped: false,
        innerWrapped: false,
        items: Array.from({ length: 4 }, (_, k) => ({
          ref: nextRef++,
          label: `按钮-${g}-${k}`,
          selected: false,
        })),
      })),
      betweenItems: Array.from({ length: 6 }, (_, g) => [
        {
          ref: nextRef++,
          label: `顶层相邻-${g}`,
          selected: false,
        },
      ]),
    })

    const serializeState = (state: { groups: GroupNode[]; betweenItems: BtnNode[][] }): string => {
      const lines = ['```yaml', '- main "根容器"']
      for (let idx = 0; idx < state.groups.length; idx++) {
        const g = state.groups[idx]
        if (g.outerWrapped) {
          lines.push(`  - generic "外层加载层-${g.id}"`)
        }
        const gPad = g.outerWrapped ? '    ' : '  '
        lines.push(`${gPad}- region "${g.title}"`)
        if (g.innerWrapped) {
          lines.push(`${gPad}  - generic "内层加载层"`)
        }
        const itemPad = g.innerWrapped ? `${gPad}    ` : `${gPad}  `
        for (const item of g.items) {
          const token = item.selected ? ' [selected]' : ''
          lines.push(`${itemPad}- button #${item.ref}${token} "${item.label}"`)
        }
        for (const topItem of state.betweenItems[idx]) {
          const token = topItem.selected ? ' [selected]' : ''
          lines.push(`  - button #${topItem.ref}${token} "${topItem.label}"`)
        }
      }
      lines.push('```')
      return lines.join('\n')
    }

    const indexState = (state: { groups: GroupNode[]; betweenItems: BtnNode[][] }) => {
      const byRef = new Map<number, { parentId: number; pos: number; sig: string }>()
      let topPos = 0
      for (let idx = 0; idx < state.groups.length; idx++) {
        const g = state.groups[idx]
        g.items.forEach((item, pos) => {
          byRef.set(item.ref, {
            parentId: g.id,
            pos,
            sig: `${item.selected ? '[selected] ' : ''}${item.label}`,
          })
        })
        for (const topItem of state.betweenItems[idx]) {
          byRef.set(topItem.ref, {
            parentId: -1,
            pos: topPos++,
            sig: `${topItem.selected ? '[selected] ' : ''}${topItem.label}`,
          })
        }
      }
      return byRef
    }

    const extractDiffRefs = (diffText: string) => {
      const removed = new Set<number>()
      const added = new Set<number>()
      for (const line of diffText.split('\n')) {
        const m = line.match(/^([+-])\s+-\s+button\s+#(\d+)/)
        if (!m) continue
        if (m[1] === '-') removed.add(Number(m[2]))
        else added.add(Number(m[2]))
      }
      return { removed, added }
    }

    const cache = new PageStateCache()
    const url = 'https://console.example.com/invariant-fuzz'
    const state = makeInitialState()
    cache.update(url, serializeState(state))

    let diffCount = 0
    for (let step = 0; step < 100; step++) {
      const prevIdx = indexState(state)

      // 每步执行 1~3 次混合操作（含紧邻兄弟窗口内的不相似改名、外层拆包与同步移入/移出）
      const ops = 1 + pickInt(3)
      for (let op = 0; op < ops; op++) {
        const action = pickInt(9)
        const gIdx = pickInt(state.groups.length)
        const g = state.groups[gIdx]
        const adjacentTop = state.betweenItems[gIdx]
        if (action === 0) {
          // 新增按钮
          const pos = pickInt(g.items.length + 1)
          g.items.splice(pos, 0, {
            ref: nextRef++,
            label: `新增-${step}-${op}`,
            selected: false,
          })
        } else if (action === 1 && g.items.length > 1) {
          // 删除按钮
          g.items.splice(pickInt(g.items.length), 1)
        } else if (action === 2 && g.items.length > 0) {
          // 切换按钮状态或文案
          const item = g.items[pickInt(g.items.length)]
          if (pickInt(2) === 0) item.selected = !item.selected
          else item.label = `更新-${step}-${item.ref}`
        } else if (action === 3) {
          // 相似改名或内层包装切换
          if (pickInt(2) === 0) g.title = `分组-${g.id} (${g.items.length + step})`
          else g.innerWrapped = !g.innerWrapped
        } else if (action === 4 && g.items.length > 0) {
          // 分组间跨父移动
          const target = state.groups[(gIdx + 1 + pickInt(state.groups.length - 1)) % state.groups.length]
          const [moved] = g.items.splice(pickInt(g.items.length), 1)
          target.items.splice(pickInt(target.items.length + 1), 0, moved)
        } else if (action === 5 && g.items.length >= 2) {
          // 同父重排
          const a = pickInt(g.items.length)
          const b = (a + 1 + pickInt(g.items.length - 1)) % g.items.length
          const tmp = g.items[a]
          g.items[a] = g.items[b]
          g.items[b] = tmp
        } else if (action === 6) {
          // 无 #ref 容器改名为完全不相关名称，并在同一步从紧邻顶层按钮移入或把内部按钮移出到紧邻位置
          g.title = `${unrelatedNames[pickInt(unrelatedNames.length)]}-${step}`
          if (pickInt(2) === 0 && adjacentTop.length > 0) {
            const [moved] = adjacentTop.splice(0, 1)
            g.items.push(moved)
          } else if (g.items.length > 1) {
            const [moved] = g.items.splice(g.items.length - 1, 1)
            adjacentTop.unshift(moved)
          }
        } else if (action === 7) {
          // 外层包装加入/移除（拆包后 region 上移一层），并同步把紧邻顶层按钮移入
          g.outerWrapped = !g.outerWrapped
          if (!g.outerWrapped && adjacentTop.length > 0) {
            const [moved] = adjacentTop.splice(0, 1)
            g.items.push(moved)
          }
        } else if (action === 8) {
          // 紧邻顶层与分组之间双向移动
          if (adjacentTop.length > 0 && pickInt(2) === 0) {
            const [moved] = adjacentTop.splice(0, 1)
            g.items.push(moved)
          } else if (g.items.length > 1) {
            const [moved] = g.items.splice(g.items.length - 1, 1)
            adjacentTop.unshift(moved)
          }
        }
      }

      const currIdx = indexState(state)
      const res = cache.update(url, serializeState(state))
      if (res.kind !== 'diff') continue
      diffCount++

      const { removed, added } = extractDiffRefs(res.diffText)

      // 不变式 1：所有已删除的 #ref 必须在 diff 的 '-' 行出现
      for (const ref of prevIdx.keys()) {
        if (!currIdx.has(ref)) {
          expect(removed.has(ref), `step=${step} 缺失已删除 #${ref}`).toBe(true)
        }
      }
      // 不变式 2：所有新增的 #ref 必须在 diff 的 '+' 行出现
      for (const ref of currIdx.keys()) {
        if (!prevIdx.has(ref)) {
          expect(added.has(ref), `step=${step} 缺失新增 #${ref}`).toBe(true)
        }
      }
      // 不变式 3：存活的 #ref 若内容变化或跨父移动，必须同时在 '-' 和 '+' 行出现
      for (const [ref, before] of prevIdx.entries()) {
        const after = currIdx.get(ref)
        if (!after) continue
        if (before.sig !== after.sig || before.parentId !== after.parentId) {
          expect(removed.has(ref), `step=${step} 缺失变更/跨父移出 #${ref}`).toBe(true)
          expect(added.has(ref), `step=${step} 缺失变更/跨父移入 #${ref}`).toBe(true)
        }
      }
      // 不变式 4：同一父级（含顶层与各分组）内未被 diff 输出的存活按钮，旧/新相对顺序必须严格单调一致
      const checkParentOrder = (parentId: number, items: BtnNode[]) => {
        const untouchedPrevPositions: number[] = []
        for (const item of items) {
          const before = prevIdx.get(item.ref)
          if (!before || before.parentId !== parentId) continue
          if (removed.has(item.ref) || added.has(item.ref)) continue
          untouchedPrevPositions.push(before.pos)
        }
        for (let i = 1; i < untouchedPrevPositions.length; i++) {
          expect(
            untouchedPrevPositions[i],
            `step=${step} parentId=${parentId} 抵消吞掉了同父重排`,
          ).toBeGreaterThan(untouchedPrevPositions[i - 1])
        }
      }
      checkParentOrder(-1, state.betweenItems.flat())
      for (const g of state.groups) {
        checkParentOrder(g.id, g.items)
      }
    }

    expect(diffCount).toBeGreaterThan(50)
  })
})
