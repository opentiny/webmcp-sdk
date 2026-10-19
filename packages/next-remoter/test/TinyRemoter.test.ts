import { describe, expect, it } from 'vitest'
import * as RemoterExports from '../src/index'
import TinyRobotChat from '../src/components/TinyRobotChat.vue'

describe('TinyRemoter 组件与导出契约', () => {
  it('复现：主入口导出符合规范，正确导出 TinyRobotChat 与别名 TinyRemoter', () => {
    expect(RemoterExports.TinyRobotChat).toBeDefined()
    expect(RemoterExports.TinyRemoter).toBeDefined()
    expect(RemoterExports.TinyRobotChat).toBe(RemoterExports.TinyRemoter)
    expect(RemoterExports.useRemoterRuntime).toBeDefined()
  })

  it('复现：TinyRobotChat 组件包含预期的 props 声明', () => {
    const props = (TinyRobotChat as any).props || {}
    // 验证核心 props 存在
    expect(props).toHaveProperty('title')
    expect(props).toHaveProperty('agentRoot')
    expect(props).toHaveProperty('sessionId')
    expect(props).toHaveProperty('llmConfig')
    expect(props).toHaveProperty('genUiComponents')
    expect(props).toHaveProperty('customMarketMcpServers')
    expect(props).toHaveProperty('mcpServers')
  })
})
