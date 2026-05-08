import { extractTextFromTree } from './utils/accessibilityTree'
import { snapshotManagerPool } from './utils/snapshotManagerPool'
import { getCurrentTabId, waitForTabLoad } from './utils/utils'
import { withToolAnimation } from './utils/toolAnimationWrapper'
import { executeVisualAction } from './visual'
import { executeSnapshotAction } from './accessibility'
import { getSnapshotManager } from './accessibility/utils'
import { waitForPageToolsReady } from './utils/waitForPageTools'

type NativeModelContext = {
  registerTool: (def: {
    name: string
    title?: string
    description?: string
    inputSchema?: object
    execute: (args: any) => Promise<any>
  }) => void
}

/**
 * 向 navigator.modelContext 注册插件内置工具。
 * 使用原生 JSON Schema（非 Zod），与内置 WebMCP 兼容。
 */
export const useExtraTools = (nativeCtx: NativeModelContext) => {
  // ─────────────────── 标签页管理 ───────────────────
  nativeCtx.registerTool({
    name: 'tabs-manager',
    title: '标签页管理',
    description: '可以在当前环境中，打开新网址，切换标签页，关闭标签页，查询全部标签页等操作',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['open', 'switch', 'close', 'switch-pre-tab', 'list-tabs'],
          description:
            '操作类型：open（打开新网址）、switch（切换标签页）、close（关闭标签页）、switch-pre-tab（切换上一个标签页）、list-tabs（查询全部标签页）'
        },
        url: {
          type: 'string',
          description: '要打开的网址。在 open 操作时必须传入该参数。'
        },
        tabId: {
          type: 'number',
          description: '待操作的标签页 ID。在 switch 或 close 操作时必须传入该参数。'
        }
      },
      required: ['action']
    },
    execute: async ({ action, url, tabId }: any) => {
      if (action === 'open') {
        if (!url) return { content: [{ type: 'text', text: '打开新网址工具错误: 缺少网址参数' }] }

        try {
          const { manager } = await getSnapshotManager()
          await manager.highlightPage(false)
        } catch (_) {}

        const isUrlMatch = (tabUrl: string | undefined, targetUrl: string): boolean => {
          if (!tabUrl) return false
          try {
            const current = new URL(tabUrl)
            const expected = new URL(targetUrl)
            if (current.href === expected.href) return true
            return current.origin === expected.origin && current.pathname === expected.pathname
          } catch (_) {
            return tabUrl.startsWith(targetUrl) || targetUrl.startsWith(tabUrl)
          }
        }

        const allTabs = await browser.tabs.query({})
        const matchedTab = allTabs.find((tab) => isUrlMatch(tab.url, url))

        if (matchedTab && matchedTab.id) {
          try {
            await browser.tabs.update(matchedTab.id, { active: true })
            if (matchedTab.status !== 'complete') await waitForTabLoad(matchedTab.id)
            // 等待页面工具注册握手（超时自动放行）
            await waitForPageToolsReady(matchedTab.id)
            return {
              content: [{ type: 'text', text: `网址已在标签页中打开，已切换到该标签页, tabId: ${matchedTab.id}` }]
            }
          } catch (_) {
            const createdTab = await browser.tabs.create({ url, active: true })
            await waitForTabLoad(createdTab.id!)
            // 等待页面工具注册握手（超时自动放行）
            await waitForPageToolsReady(createdTab.id!)
            return { content: [{ type: 'text', text: `已打开新网址, tabId: ${createdTab.id}` }] }
          }
        } else {
          const createdTab = await browser.tabs.create({ url, active: true })
          await waitForTabLoad(createdTab.id!)
          // 等待页面工具注册握手（超时自动放行）
          await waitForPageToolsReady(createdTab.id!)
          return { content: [{ type: 'text', text: `已打开新网址, tabId: ${createdTab.id}` }] }
        }
      }

      if (action === 'switch') {
        if (!tabId) return { content: [{ type: 'text', text: '切换标签页工具错误: 缺少标签页 ID 参数' }] }
        try {
          const { manager } = await getSnapshotManager()
          await manager.highlightPage(false)
        } catch (_) {}
        try {
          const tab = await browser.tabs.get(tabId)
          await browser.tabs.update(tabId, { active: true })
          // 如果页面还没加载完，先等加载完
          if (tab.status !== 'complete') await waitForTabLoad(tabId)
          // 等待页面工具注册握手（超时自动放行）
          await waitForPageToolsReady(tabId)
          return { content: [{ type: 'text', text: `已切换到标签页 ${tabId}` }] }
        } catch (err: any) {
          return { content: [{ type: 'text', text: `切换标签页工具错误: ${err.message}` }] }
        }
      }

      if (action === 'close') {
        if (!tabId) return { content: [{ type: 'text', text: '关闭标签页工具错误: 缺少标签页 ID 参数' }] }
        try {
          await browser.tabs.remove(tabId)
          return { content: [{ type: 'text', text: `已关闭标签页 ${tabId}` }] }
        } catch (err: any) {
          return { content: [{ type: 'text', text: `关闭标签页工具错误: ${err.message}` }] }
        }
      }

      if (action === 'switch-pre-tab') {
        try {
          const { manager } = await getSnapshotManager()
          await manager.highlightPage(false)
        } catch (_) {}
        try {
          await sendRuntimeMessage('active-pre-tab', {}, 'side->bg')
          return { content: [{ type: 'text' as const, text: '已激活上一个标签页' }] }
        } catch (err: any) {
          return { content: [{ type: 'text' as const, text: `激活上一个标签页工具错误: ${err.message}` }] }
        }
      }

      if (action === 'list-tabs') {
        const allTabs = await browser.tabs.query({})
        return {
          content: [
            {
              type: 'text',
              text: `所有标签页为： ${JSON.stringify(allTabs.map((tab) => ({ tabId: tab.id, url: tab.url, title: tab.title })))}`
            }
          ]
        }
      }
    }
  })

  //   // ─────────────────── 获取页面文本信息 ───────────────────
  //   nativeCtx.registerTool({
  //     name: 'getPageInfomation',
  //     title: '获取浏览器页面文本信息、文档、文章、wiki、博客、知识库内容，用来总结文章或知识库',
  //     description: '获取文本信息、文档、文章、wiki、博客、知识库，并提取其中的文本信息（包括按钮文本、链接文本、输入框值等），用于分析页面内容。只返回文本信息。',
  //     inputSchema: {
  //       type: 'object',
  //       properties: {
  //         tabId: {
  //           type: 'number',
  //           description: '目标标签页 ID，如果不提供则使用当前活动标签页'
  //         }
  //       }
  //     },
  //     execute: withToolAnimation('getPageInfomation', async ({ tabId }: any) => {
  //       const currentTabId = tabId || (await getCurrentTabId())
  //       const manager = await snapshotManagerPool.getManager(currentTabId)
  //       try {
  //         const snapshot = await manager.createTextSnapshot(false)
  //         const textItems = extractTextFromTree(snapshot.root)
  //         const textSummary = textItems.map((item) => {
  //           const roleInfo = item.role ? `[${item.role}] ` : ''
  //           return `${roleInfo}${item.text}`
  //         })

  //         const stats = {
  //           total: textItems.length,
  //           byType: textItems.reduce((acc, item) => { acc[item.type] = (acc[item.type] || 0) + 1; return acc }, {} as Record<string, number>),
  //           byRole: textItems.reduce((acc, item) => { const role = item.role || 'unknown'; acc[role] = (acc[role] || 0) + 1; return acc }, {} as Record<string, number>)
  //         }

  //         const maxTexts = 500
  //         const displayTexts = textSummary.slice(0, maxTexts)
  //         const remainingCount = textSummary.length - maxTexts

  //         let resultText = `已成功提取页面文本信息，共 ${textItems.length} 条文本。\n\n`
  //         resultText += `统计信息：\n- 总计：${stats.total} 条\n- 按类型：${JSON.stringify(stats.byType, null, 2)}\n- 按角色：${JSON.stringify(stats.byRole, null, 2)}\n\n`
  //         if (remainingCount > 0) resultText += `（仅显示前 ${maxTexts} 条，还有 ${remainingCount} 条未显示）\n\n`
  //         resultText += `页面文本内容：\n\`\`\`\n${displayTexts.join('\n')}\n\`\`\``

  //         return { content: [{ type: 'text', text: resultText }] }
  //       } catch (err: any) {
  //         return { content: [{ type: 'text', text: `获取页面文本信息失败：${err.message}` }] }
  //       } finally {
  //         await snapshotManagerPool.releaseManager(currentTabId)
  //       }
  //     })
  //   })

  //   // ─────────────────── Accessibility 工具 ───────────────────
  //   nativeCtx.registerTool({
  //     name: 'accessibility',
  //     title: 'Accessibility 工具',
  //     description: `基于无障碍树和 UID 的页面操作工具集合，支持获取页面快照和通过 UID 进行操作。
  // 每个节点的 UID 格式为 "snapshotId_counter"，例如 "1_5"。
  // 可用操作：
  // - snapshot: 获取页面的完整无障碍树结构快照，包含每个节点的唯一 UID。返回的快照可以用于后续的页面操作。
  // - click: 通过快照中的 UID 点击页面元素。需提供 uid。可选 button（left/right/middle）和 dblClick（是否双击）。点击前无需先 scroll，直接使用 click 即可。
  // - fill: 通过快照中的 UID 在输入框中输入文本。需提供 uid 和 text。可选 clearFirst（是否先清空输入框）。输入前无需先 scroll，直接使用 fill 即可。
  // - scroll: 【低优先级】仅在用户明确要求滚动时使用。若不提供 uid 则滚动整个页面；提供 uid 但不提供 x/y 则将元素滚动到视图中；提供 uid 和 x/y 则在元素内滚动到指定位置。可选 behavior（auto/smooth）。注意：不要为「方便点击/输入」而先调用 scroll，直接对目标元素使用 click 或 fill。
  // - copy: 从指定节点复制文本内容。需提供 uid。返回复制的文本内容（输入框返回 value，其他元素返回 textContent）。
  // - paste: 将文本粘贴到指定节点。需提供 uid 和 text。会自动聚焦并全选后输入文本。`,
  //     inputSchema: {
  //       type: 'object',
  //       properties: {
  //         tabId: { type: 'number', description: '目标标签页 ID，如果不提供则使用当前活动标签页' },
  //         action: {
  //           type: 'string',
  //           enum: ['snapshot', 'click', 'fill', 'scroll', 'copy', 'paste'],
  //           description: '操作类型：snapshot（获取快照）、click（点击）、fill（输入文本）、scroll（仅当用户明确要求滚动时使用）、copy（复制文本）、paste（粘贴文本）'
  //         },
  //         uid: {
  //           type: 'string',
  //           description: '快照中节点的 UID（格式：snapshotId_counter，如 "1_5"）。click、fill、copy、paste 操作必填；scroll 操作可选（不提供则滚动整个页面）'
  //         },
  //         button: {
  //           type: 'string',
  //           enum: ['left', 'right', 'middle'],
  //           description: '鼠标按钮类型（仅用于 click 操作），默认为 left'
  //         },
  //         dblClick: { type: 'boolean', description: '是否双击（仅用于 click 操作），默认为 false' },
  //         text: { type: 'string', description: '要输入的文本（用于 fill 和 paste 操作）' },
  //         clearFirst: { type: 'boolean', description: '是否先清空输入框（仅用于 fill 操作），默认为 true' },
  //         x: { type: 'number', description: '水平滚动位置（仅用于 scroll 操作）' },
  //         y: { type: 'number', description: '垂直滚动位置（仅用于 scroll 操作）' },
  //         behavior: { type: 'string', enum: ['auto', 'smooth'], description: '滚动行为（仅用于 scroll 操作），默认为 auto' }
  //       },
  //       required: ['action']
  //     },
  //     execute: withToolAnimation('accessibility', async (params: any) => {
  //       return await executeSnapshotAction(params)
  //     })
  //   })

  //   // ─────────────────── Visual 工具 ───────────────────
  //   nativeCtx.registerTool({
  //     name: 'visual',
  //     title: 'Visual Control',
  //     description: `基于视觉截图和坐标的页面操作工具，支持通过截图坐标进行点击、输入等操作。适用于视觉模型。

  // ⚠️ 坐标系统规范（纯视觉定位）：
  // 1. 坐标基准：基于压缩后的截图（最大宽度 1024px），左上角为 [0, 0]，x 向右增加，y 向下增加
  // 2. 坐标格式：像素坐标（整数），相对于压缩后的截图尺寸
  // 3. 坐标精度：所有点击坐标必须是目标元素的**视觉中心点**
  //    - 对于按钮、链接：计算元素边界框的中心位置
  //    - 对于文本：点击文字的中心区域，不要点击起始位置
  //    - 对于小元素：宁可偏向中心，避免靠近边缘
  // 4. 重要：先观察截图的实际尺寸，然后基于该尺寸计算坐标

  // 📐 坐标计算示例：
  // - 如果截图是 1024×768，要点击中心：coordinate = [512, 384]
  // - 如果按钮在截图中的位置是左上(100,200)到右下(300,250)，中心点：coordinate = [200, 225]
  // 可用操作：
  // - left_click: 在指定坐标点击左键。coordinate [x, y] 必须是目标元素的中心点。
  // - right_click: 在指定坐标点击右键。coordinate [x, y] 必须是目标元素的中心点。
  // - middle_click: 在指定坐标点击中键。
  // - double_click: 在指定坐标双击。
  // - type: 在输入框中输入文本。需提供 text。如果提供 coordinate，则先点击该坐标再输入。可选 press_enter, delete_existing_text。
  // - key: 按下特定按键。需提供 text (按键名称，如 "Enter", "Escape")。
  // - screenshot: 捕获当前页面截图。
  // - scroll: 滚动页面。需提供 pixels (正数向下，负数向上)。
  // - cursor_position: 获取当前鼠标位置。
  // - history: 浏览器历史记录操作。需提供 arg ("back" 或 "forward")。
  // - history_back: 后退到上一页。
  // - history_forward: 前进到下一页。`,
  //     inputSchema: {
  //       type: 'object',
  //       properties: {
  //         action: {
  //           type: 'string',
  //           enum: [
  //             'left_click', 'right_click', 'middle_click', 'double_click',
  //             'type', 'key', 'screenshot', 'cursor_position', 'scroll',
  //             'history', 'history_back', 'history_forward'
  //           ],
  //           description: '操作类型'
  //         },
  //         coordinate: {
  //           type: 'array',
  //           items: { type: 'number' },
  //           description: '坐标 [x, y]，点击操作必填'
  //         },
  //         text: { type: 'string', description: '输入文本或按键名称 (type 或 key 操作必填)' },
  //         arg: { type: 'string', description: '操作参数 (history 操作必填，取值 "back" 或 "forward")' },
  //         pixels: { type: 'number', description: '滚动像素 (正值向下，负值向上)' },
  //         press_enter: { type: 'boolean', description: '输入后是否回车 (type 操作可选)' },
  //         delete_existing_text: { type: 'boolean', description: '输入前是否清空 (type 操作可选)' },
  //         time: { type: 'number', description: '等待时间（秒，仅用于 wait 操作）' }
  //       },
  //       required: ['action']
  //     },
  //     execute: withToolAnimation('visual', async (params: any) => {
  //       const currentTabId = await getCurrentTabId()
  //       const manager = await snapshotManagerPool.getManager(currentTabId)
  //       try {
  //         const page = manager.getPage()
  //         if (!page) throw new Error('页面未连接，请先确保标签页已加载')
  //         return await executeVisualAction({ page, ...params })
  //       } catch (err: any) {
  //         return { content: [{ type: 'text' as const, text: `Visual 工具错误: ${err.message}` }] }
  //       } finally {
  //         await snapshotManagerPool.releaseManager(currentTabId)
  //       }
  //     })
  //   })

  // ─────────────────── page-agent-tool（通用 DOM 操作）───────────────────
  // 执行路径：sidepanel → runtime.sendMessage(PAGE_CONTROL) → background → tabs.sendMessage → content script
  // content script 里的 PageController 在 ISOLATED world 运行，完全不受页面 CSP 限制
  nativeCtx.registerTool({
    name: 'page-agent-tool',
    title: 'Page Agent 工具',
    description: `用于分析和操作当前浏览器页面的通用工具。
每次执行 click、fill、select 动作前，**必须**先调用 browserState 获取页面最新状态。
- browserState：获取页面标题、URL、HTML 无障碍树内容（包含可操作元素及其索引）
- click：根据元素索引点击
- fill：根据元素索引填写文本
- select：根据元素索引选择下拉框选项
- scroll：滚动页面（不带 index：滚动整个文档；带 index：滚动该元素的最近可滚动祖先）
- executeJavascript：执行 JavaScript 代码`,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['browserState', 'click', 'fill', 'select', 'scroll', 'executeJavascript'],
          description: '执行的动作名称'
        },
        index: { type: 'number', description: '元素索引（click/fill/select 时必须提供）' },
        text: { type: 'string', description: '文本内容（fill/select 时必须提供）' },
        down: { type: 'boolean', description: '上下滚动方向（scroll 时必须提供）' },
        right: { type: 'boolean', description: '水平滚动方向（scroll 时可选）' },
        numPages: { type: 'number', description: '滚动页数（建议 0.1，最大 5）' },
        pixels: { type: 'number', description: '滚动像素数' },
        script: { type: 'string', description: 'JavaScript 代码（executeJavascript 时必须提供）' }
      },
      required: ['action']
    },
    execute: async (args: any) => {
      const tabId = await getCurrentTabId()
      if (!tabId) {
        return { content: [{ type: 'text', text: 'Error: 无法获取当前标签页' }] }
      }

      const callPageControl = async (action: string, ...payload: any[]) => {
        const res = await browser.runtime.sendMessage({
          type: 'PAGE_CONTROL',
          tabId,
          action,
          payload
        })
        if (!res?.success) throw new Error(res?.error || 'PAGE_CONTROL 调用失败')
        return res.result
      }

      try {
        await callPageControl('show_mask')

        let result: any
        if (args.action === 'browserState') {
          result = await callPageControl('get_browser_state')
          await callPageControl('hide_mask')
          await callPageControl('clean_up_highlights')
          return { content: [{ type: 'text', text: `浏览器状态: ${JSON.stringify(result)}` }] }
        } else if (args.action === 'click') {
          if (args.index == null) return { content: [{ type: 'text', text: '点击结果: 缺少元素索引' }] }
          result = await callPageControl('click_element', args.index)
        } else if (args.action === 'fill') {
          if (args.index == null || !args.text) return { content: [{ type: 'text', text: '填写结果: 缺少元素索引或文本' }] }
          result = await callPageControl('input_text', args.index, args.text)
        } else if (args.action === 'select') {
          if (args.index == null || !args.text) return { content: [{ type: 'text', text: '选择结果: 缺少元素索引或文本' }] }
          result = await callPageControl('select_option', args.index, args.text)
        } else if (args.action === 'scroll') {
          if (!args.down && !args.right) return { content: [{ type: 'text', text: '滚动结果: 缺少滚动方向参数' }] }
          const scrollArgs = { index: args.index, numPages: args.numPages, pixels: args.pixels }
          result = args.right
            ? await callPageControl('scroll_horizontally', { ...scrollArgs, right: args.right })
            : await callPageControl('scroll', { ...scrollArgs, down: args.down })
        } else if (args.action === 'executeJavascript') {
          if (!args.script) return { content: [{ type: 'text', text: '脚本执行异常: 缺少 JavaScript 代码' }] }
          result = await callPageControl('execute_javascript', args.script)
        }

        await callPageControl('hide_mask')
        await callPageControl('clean_up_highlights')
        return { content: [{ type: 'text', text: `${args.action} 结果: ${JSON.stringify(result)}` }] }
      } catch (error: any) {
        return { content: [{ type: 'text', text: `page-agent-tool 异常: ${error.message}` }] }
      }
    }
  })
}

