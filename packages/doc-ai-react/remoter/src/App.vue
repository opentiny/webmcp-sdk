<template>
  <tiny-remoter
    show
    :fullscreen="true"
    :menuItems="menuItems"
    :mcpServers="mcpServers"
    :skills="skillMdModules"

    :systemPrompt="systemPrompt"
    :promptItems="ecommercePromptItems"
    :pillItems="ecommercePillItems"
        :llmConfig="llmConfig"
  />
</template>

<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import type { McpServerConfig, MenuItemConfig } from '@opentiny/next-sdk'
import { ref,h } from 'vue'

// 第五步：在 App.vue 接入 TinyRemoter
const menuItems = ref<MenuItemConfig[]>([])

/** 加载 skills 目录下所有 markdown（技能定义），与 next-remoter 示例一致 */
const skillMdModules = import.meta.glob('./skills/**/*', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

const nav = navigator as Navigator & { modelContextTesting?: object }
const mcpServers: Record<string, McpServerConfig> = {
  'mcp-server-builtin-webmcp': {
    type: 'builtin' as const,
    client: nav.modelContextTesting
  }
}


// 电商管理平台：欢迎区建议卡片（上方大卡片）
const ecommercePromptItems = [
  {
    label: '订单与物流',
    description: '需要查订单状态、物流信息，还是根据客户姓名找订单？',
    icon: h('span', { style: { fontSize: '18px' } }, '📦'),
    badge: 'NEW'
  },
  {
    label: '价保与售后',
    description: '要创建价保申请、补差价，还是查看价保单审核状态？',
    icon: h('span', { style: { fontSize: '18px' } }, '🛡️')
  },
  {
    label: '库存与销售',
    description: '需要商品入库、查销售趋势，还是看财务对账？',
    icon: h('span', { style: { fontSize: '18px' } }, '📊')
  }
]

// 电商管理平台：输入框上方快捷操作按钮（小药丸按钮 + 下拉菜单）
const ecommercePillItems = [
  {
    id: 'orders',
    text: '订单物流',
    menus: [
      { id: 0, text: '查订单状态', inputMessage: '帮我查一下订单 ORD-5X9A2B 的当前状态和物流信息。' },
      { id: 1, text: '按客户查单', inputMessage: '请根据客户姓名「张三」查询他的订单列表。' }
    ]
  },
  {
    id: 'price-protection',
    text: '价保售后',
    menus: [
      {
        id: 0,
        text: '创建价保',
        inputMessage: '帮我给用户王五创建一个价保申请单，金额 1000 元，原因为百亿补贴。'
      },
      { id: 1, text: '查价保单', inputMessage: '帮我查看当前待审核的价保申请列表。' }
    ]
  },
  {
    id: 'inventory-sales',
    text: '库存与销售',
    menus: [
      { id: 0, text: '商品入库', inputMessage: '请把 200 台 MacBook Pro 入库到上海二号仓。' },
      { id: 1, text: '销售趋势', inputMessage: '帮我看看最近 30 天的商品销售趋势。' },
      { id: 2, text: '财务对账', inputMessage: '打开财务管理看板，看一下本月支出和可用余额。' }
    ]
  }
]

const systemPrompt = `你是「电商智能管理系统」的内置助理，必须严格遵守以下工具调用规则：

1）技能文档优先：
- 在调用任何业务工具（如下单、价保、库存等）之前，必须先调用 get_skill_content 工具读取对应 skill 技能文档。
- 只有在「确认已经阅读并理解技能文档」之后，才允许继续调用后续业务工具。

2）只调用已提供的工具，禁止“猜名字”：
- 你只能从当前上下文中「明确列出的 MCP 工具列表」中选择工具名称，必须一字不差地使用列表里的名称。
- 绝对禁止凭空发明或猜测新的工具名，例如把 add_price_protection 写成 create_price_protection、create_xxx、new_xxx、xxx_v2 等变体。
- 如果你打算调用的工具在工具列表中找不到「完全相同的名称」，请**立刻停止调用**，直接用自然语言回复用户：当前系统中没有对应的工具能力，需要开发者补充工具后才能完成该操作。

3）处理“工具不存在”错误的方式：
- 如果工具调用返回「工具不存在」「unknown tool」「not found」等类似错误，说明你使用了一个并不在列表中的名称。
- 此时禁止继续尝试其它相似拼写或新名字（例如从 create_price_protection 换成 create_price_protect 等）。
- 正确做法是：向用户清晰说明「当前没有名为 X 的工具，系统中仅存在这些工具：……」，并建议由开发者新增或改造工具，而不是继续胡乱重试。

4）工具选择策略：
- 先根据用户意图，从当前可见工具中选择**最匹配的一个或少数几个**工具，而不是随便调用。
- 工具名称以「当前上下文中列出的 MCP 工具列表」为准（例如价保场景下可能是创建申请、查询列表、审批、查看详情等，具体名称依项目注册而定）；若列表中没有你需要的操作，就按第 2 项规则向用户说明缺失能力。

请始终记住：你是一个「只会调用显式列出工具」的严格代理，**宁可告诉用户“系统暂不支持该能力”，也不要调用任何不存在的工具或凭空猜测工具名。**`

const llmConfig = {
  providerType: 'deepseek',
  model: 'deepseek-chat',
  apiKey: 'sk-4499ad317f6a441a993dbb7378eed65d',
  baseURL: `https://api.deepseek.com`,
}
</script>
