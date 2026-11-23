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

  it('复现：页面上方插入一个元素导致 400 行全部进入删除与新增使 diff 膨胀至整页 2.1 倍 —— 稳定编号重构后仅输出实际变更行', () => {
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
    expect(r2.isFullRefresh).toBe(true)
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
})
