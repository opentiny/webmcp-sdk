/**
 * OpenTiny TinyVue 子模块工具
 * 提供 TinyVue 组件库相关的操作工具
 */
export default ({ server, z }) => {
  // 注册工具：获取组件文档信息
  server.registerTool(
    'getTinyVueComponentDoc',
    {
      title: '获取 TinyVue 组件文档',
      description: '获取 TinyVue 组件库的文档信息，包括组件名称、属性、事件等',
      inputSchema: {
        componentName: z.string().optional().describe('组件名称，如不提供则返回当前页面的组件信息')
      }
    },
    async ({ componentName }) => {
      try {
        // 从当前页面 URL 或参数中获取组件信息
        const url = new URL(window.location.href)
        const currentComponent = componentName || url.pathname.split('/').pop() || '未知组件'
        
        // 尝试从页面中提取组件文档信息
        const title = document.querySelector('h1')?.textContent || currentComponent
        const description = document.querySelector('.component-description, .desc')?.textContent || ''
        
        return {
          content: [
            {
              type: 'text',
              text: `TinyVue 组件文档：\n组件名称：${title}\n描述：${description}\n当前页面：${window.location.href}`
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `获取组件文档失败：${error.message}`
            }
          ]
        }
      }
    }
  )

  // 注册工具：搜索 TinyVue 组件
  server.registerTool(
    'searchTinyVueComponents',
    {
      title: '搜索 TinyVue 组件',
      description: '在 TinyVue 组件库中搜索组件',
      inputSchema: {
        keyword: z.string().describe('搜索关键词')
      }
    },
    async ({ keyword }) => {
      try {
        // 从页面中提取组件列表
        const componentLinks = Array.from(document.querySelectorAll('a[href*="/tiny-vue"]'))
          .map(link => ({
            name: link.textContent?.trim() || '',
            url: (link as HTMLAnchorElement).href
          }))
          .filter(item => item.name.toLowerCase().includes(keyword.toLowerCase()))
        
        if (componentLinks.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `未找到包含关键词 "${keyword}" 的组件`
              }
            ]
          }
        }
        
        const resultText = componentLinks
          .map(item => `- ${item.name}: ${item.url}`)
          .join('\n')
        
        return {
          content: [
            {
              type: 'text',
              text: `找到 ${componentLinks.length} 个相关组件：\n${resultText}`
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `搜索组件失败：${error.message}`
            }
          ]
        }
      }
    }
  )
}
