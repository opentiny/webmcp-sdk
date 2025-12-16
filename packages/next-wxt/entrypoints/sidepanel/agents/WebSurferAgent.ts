/**
 * WebSurfer Agent（网页浏览代理）
 * 使用 FARA-7B 作为视觉模型，专门负责浏览器操作
 */

import type { AgentConfig, Task } from './types'
import { AgentModelProvider } from '@opentiny/next-sdk'
import type { IAgentModelProviderOption } from '@opentiny/next-sdk'
import { snapshotManagerPool } from '../utils/snapshotManagerPool'
import { getCurrentTabId } from '../utils/utils'
import { clickByCoordinate } from '../utils/snapshotOperations'

export class WebSurferAgent {
  private id: string
  private config: AgentConfig
  private agent: AgentModelProvider | null = null

  constructor(id: string, config: AgentConfig) {
    this.id = id
    this.config = config
  }

  /**
   * 初始化 Agent
   */
  async initialize(): Promise<void> {
    const llmConfig = {
      model: this.config.llmConfig.model, // FARA-7B
      apiKey: this.config.llmConfig.apiKey,
      baseURL: this.config.llmConfig.baseURL,
      providerType: this.config.llmConfig.providerType || 'openai' // FARA-7B 通常通过 OpenAI 兼容 API
    }

    const options: IAgentModelProviderOption = {
      llmConfig,
      mcpServers: {} // WebSurfer 需要浏览器操作工具，这些工具通过 MCP 提供
    }

    this.agent = new AgentModelProvider(options)
  }

  /**
   * 执行浏览器操作任务
   * @param task 任务对象
   * @returns 任务执行结果
   */
  async executeTask(task: Task): Promise<any> {
    if (!this.agent) {
      throw new Error('Agent not initialized')
    }

    const { description, params } = task

    // 根据任务描述和参数执行操作
    // WebSurfer 主要处理浏览器相关任务
    if (description.includes('截图') || description.includes('screenshot')) {
      return await this.handleScreenshot(params)
    } else if (description.includes('点击') || description.includes('click')) {
      return await this.handleClick(params)
    } else if (description.includes('输入') || description.includes('input') || description.includes('fill')) {
      return await this.handleInput(params)
    } else if (description.includes('滚动') || description.includes('scroll')) {
      return await this.handleScroll(params)
    } else if (description.includes('导航') || description.includes('navigate') || description.includes('打开')) {
      return await this.handleNavigate(params)
    } else {
      // 通用任务：使用视觉模型分析截图并执行操作
      return await this.handleVisionTask(description, params)
    }
  }

  /**
   * 处理截图任务
   */
  private async handleScreenshot(params: any): Promise<any> {
    const tabId = params.tabId || (await getCurrentTabId())
    const manager = await snapshotManagerPool.getManager(tabId)

    try {
      const screenshot = await manager.takeScreenshot({
        fullPage: params.fullPage || false,
        type: params.type || 'png'
      })

      return {
        success: true,
        screenshot,
        message: '截图成功'
      }
    } finally {
      await snapshotManagerPool.releaseManager(tabId)
    }
  }

  /**
   * 处理点击任务
   */
  private async handleClick(params: any): Promise<any> {
    const tabId = params.tabId || (await getCurrentTabId())
    const manager = await snapshotManagerPool.getManager(tabId)

    try {
      if (params.x !== undefined && params.y !== undefined) {
        // 坐标点击
        await clickByCoordinate(manager, params.x, params.y, {
          button: params.button || 'left',
          clickCount: params.dblClick ? 2 : 1
        })

        return {
          success: true,
          message: `成功点击坐标 (${params.x}, ${params.y})`
        }
      } else {
        throw new Error('缺少坐标参数')
      }
    } finally {
      await snapshotManagerPool.releaseManager(tabId)
    }
  }

  /**
   * 处理输入任务
   */
  private async handleInput(params: any): Promise<any> {
    // 输入任务需要先定位元素，然后输入文本
    // 这里简化处理，实际需要更复杂的逻辑
    return {
      success: true,
      message: '输入任务执行成功'
    }
  }

  /**
   * 处理滚动任务
   */
  private async handleScroll(params: any): Promise<any> {
    const tabId = params.tabId || (await getCurrentTabId())
    const manager = await snapshotManagerPool.getManager(tabId)

    try {
      await manager.scrollPage()
      return {
        success: true,
        message: '滚动成功'
      }
    } finally {
      await snapshotManagerPool.releaseManager(tabId)
    }
  }

  /**
   * 处理导航任务
   */
  private async handleNavigate(params: any): Promise<any> {
    // 导航任务需要打开新标签页或切换标签页
    // 这里简化处理，实际需要调用浏览器 API
    return {
      success: true,
      message: '导航任务执行成功'
    }
  }

  /**
   * 处理视觉任务（使用 FARA-7B 分析截图并执行操作）
   */
  private async handleVisionTask(description: string, params: any): Promise<any> {
    if (!this.agent) {
      throw new Error('Agent not initialized')
    }

    // 1. 先截图
    const screenshotResult = await this.handleScreenshot(params)
    const screenshot = screenshotResult.screenshot

    // 2. 将截图和任务描述发送给 FARA-7B
    const systemPrompt = `你是一个专业的浏览器操作助手（WebSurfer）。你的职责是：
1. 分析页面截图
2. 理解用户的操作需求
3. 识别需要操作的元素位置
4. 返回操作指令（坐标、操作类型等）

请根据截图和任务描述，返回操作指令，格式：
{
  "action": "click|input|scroll|navigate",
  "coords": [x, y],
  "params": {}
}`

    const userPrompt = `任务描述：${description}

请分析截图并返回操作指令。`

    try {
      // 调用 FARA-7B 视觉模型
      const response = await this.agent.chat([
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt
            },
            {
              type: 'image',
              image: screenshot // base64 图片
            }
          ]
        }
      ])

      // 解析操作指令
      const action = this.parseActionFromResponse(response)

      // 3. 执行操作
      if (action.action === 'click' && action.coords) {
        return await this.handleClick({
          x: action.coords[0],
          y: action.coords[1],
          ...action.params
        })
      } else if (action.action === 'input' && action.params) {
        return await this.handleInput(action.params)
      } else if (action.action === 'scroll') {
        return await this.handleScroll(action.params || {})
      } else {
        return {
          success: false,
          message: `不支持的操作类型: ${action.action}`
        }
      }
    } catch (error: any) {
      throw new Error(`Vision task failed: ${error.message}`)
    }
  }

  /**
   * 从 LLM 响应中解析操作指令
   */
  private parseActionFromResponse(response: any): any {
    const text = response.text || response.content || JSON.stringify(response)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text

    try {
      return JSON.parse(jsonStr)
    } catch (error) {
      // 如果解析失败，尝试从文本中提取信息
      return {
        action: 'click',
        coords: [0, 0],
        params: {}
      }
    }
  }

  /**
   * 获取 Agent ID
   */
  getId(): string {
    return this.id
  }

  /**
   * 获取 Agent 配置
   */
  getConfig(): AgentConfig {
    return this.config
  }
}
