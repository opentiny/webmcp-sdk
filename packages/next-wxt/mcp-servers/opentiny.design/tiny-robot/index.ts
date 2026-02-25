/**
 * OpenTiny TinyRobot 子模块工具
 * 提供 TinyRobot 智能助手相关的操作工具
 */
export default ({ server, z }) => {
  // 注册工具：获取 TinyRobot 信息
  server.registerTool(
    'getTinyRobotInfo',
    {
      title: '获取 TinyRobot 信息',
      description: '获取 TinyRobot 智能助手的信息和状态',
      inputSchema: {}
    },
    async () => {
      try {
        // 从当前页面中提取 TinyRobot 相关信息
        const title = document.querySelector('h1')?.textContent || 'TinyRobot'
        const description = document.querySelector('.description, .intro')?.textContent || ''
        
        // 检查页面中是否有 TinyRobot 相关元素
        const hasRobot = document.querySelector('[class*="robot"], [id*="robot"]') !== null
        
        return {
          content: [
            {
              type: 'text',
              text: `TinyRobot 信息：\n标题：${title}\n描述：${description}\n状态：${hasRobot ? '✅ 已加载' : '❌ 未检测到'}\n当前页面：${window.location.href}`
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `获取 TinyRobot 信息失败：${error.message}`
            }
          ]
        }
      }
    }
  )

  // 注册工具：获取 TinyRobot 功能列表
  server.registerTool(
    'getTinyRobotFeatures',
    {
      title: '获取 TinyRobot 功能列表',
      description: '获取 TinyRobot 支持的功能和能力列表',
      inputSchema: {}
    },
    async () => {
      try {
        // 尝试从页面中提取功能列表
        const featureElements = Array.from(
          document.querySelectorAll('.feature, .capability, [class*="feature-"], li')
        )
        
        const features = featureElements
          .map(el => el.textContent?.trim())
          .filter(text => text && text.length > 0 && text.length < 200)
          .slice(0, 20) // 最多返回 20 个功能
        
        if (features.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `TinyRobot 功能：\n当前页面未找到功能列表，请访问 TinyRobot 详情页查看`
              }
            ]
          }
        }
        
        const featureText = features.map((f, i) => `${i + 1}. ${f}`).join('\n')
        
        return {
          content: [
            {
              type: 'text',
              text: `TinyRobot 功能列表（共 ${features.length} 项）：\n${featureText}`
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `获取功能列表失败：${error.message}`
            }
          ]
        }
      }
    }
  )

  // 注册工具：检查 TinyRobot 可用性
  server.registerTool(
    'checkTinyRobotAvailability',
    {
      title: '检查 TinyRobot 可用性',
      description: '检查当前页面是否支持 TinyRobot 功能',
      inputSchema: {}
    },
    async () => {
      try {
        const currentUrl = window.location.href
        const isTinyRobotPage = currentUrl.includes('tiny-robot')
        
        // 检查页面中是否有 TinyRobot 相关的 API 或元素
        const hasRobotAPI = typeof (window as any).TinyRobot !== 'undefined'
        const hasRobotElement = document.querySelector('[class*="robot"], [id*="robot"]') !== null
        
        const status = isTinyRobotPage && (hasRobotAPI || hasRobotElement) 
          ? '✅ TinyRobot 可用' 
          : '⚠️ TinyRobot 不可用或未初始化'
        
        return {
          content: [
            {
              type: 'text',
              text: `TinyRobot 可用性检查：\n${status}\n- 在 TinyRobot 页面：${isTinyRobotPage ? '是' : '否'}\n- API 已加载：${hasRobotAPI ? '是' : '否'}\n- 页面元素存在：${hasRobotElement ? '是' : '否'}`
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `检查可用性失败：${error.message}`
            }
          ]
        }
      }
    }
  )
}
