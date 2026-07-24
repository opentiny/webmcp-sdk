import { buildElementMeta, formatElementMetaText } from './metadata'
import { getRegisteredElement } from './registry'

export const INSPECT_ELEMENT_TOOL_NAME = 'inspect-element'

/**
 * 注册 inspect-element WebMCP 工具（幂等）。
 */
export function registerInspectElementTool(): void {
  const mcp =
    (document as Document & { modelContext?: { registerTool?: (t: unknown) => void } }).modelContext ||
    (navigator as Navigator & { modelContext?: { registerTool?: (t: unknown) => void } }).modelContext

  if (!mcp || typeof mcp.registerTool !== 'function') {
    console.warn('[webmcp-cli] inspect-element: modelContext.registerTool 未就绪，跳过注册')
    return
  }

  if ((window as Window & { __webmcpcli_inspect_tool?: boolean }).__webmcpcli_inspect_tool) {
    return
  }
  ;(window as Window & { __webmcpcli_inspect_tool?: boolean }).__webmcpcli_inspect_tool = true

  mcp.registerTool({
    name: INSPECT_ELEMENT_TOOL_NAME,
    title: '检视元素元数据',
    description:
      '根据页面检视模式复制的 elementId，返回 Cursor 同款元素元数据（DOM Path / Position / HTML Element）。' +
      '用于外部 AI 理解用户点选的元素后修改源码。输入来自剪贴板引用 webmcp-inspect:v1 中的 el= 值。',
    inputSchema: {
      type: 'object',
      properties: {
        elementId: {
          type: 'string',
          description: '检视复制得到的元素 id，例如 webmcp-el-1',
        },
      },
      required: ['elementId'],
    },
    execute: async ({ elementId }: { elementId: string }) => {
      const id = String(elementId || '').trim()
      if (!id) {
        return {
          content: [{ type: 'text', text: '缺少 elementId。请从剪贴板引用 webmcp-inspect:v1 … el=<id> 中解析。' }],
          isError: true,
        }
      }
      const el = getRegisteredElement(id)
      if (!el) {
        return {
          content: [
            {
              type: 'text',
              text:
                `未找到 elementId="${id}" 对应的元素（可能已导航或页面已刷新）。` +
                '请在页面中点击右下角「WebMCP」浮钮进入检视模式，选中元素并复制后再试。',
            },
          ],
          isError: true,
        }
      }
      const text = formatElementMetaText(buildElementMeta(el))
      return {
        content: [{ type: 'text', text }],
      }
    },
  })
}
