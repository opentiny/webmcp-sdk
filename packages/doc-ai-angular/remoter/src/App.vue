<template>
  <tiny-remoter
    :skills="skillMdModules"
    :show="show"
    :fullscreen="true"
    :menuItems="menuItems"
    :mcpServers="mcpServers"
    :systemPrompt="systemPrompt"
    :promptItems="ecommercePromptItems"
    :pillItems="ecommercePillItems"
  />
</template>

<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import { createMessageChannelClientTransport } from '@opentiny/next-sdk'
import type { MenuItemConfig } from '@opentiny/next-sdk'
import { ref, h } from 'vue'

const menuItems = ref<MenuItemConfig[]>([])
const show = ref(true)
const systemPrompt = `你是「电商智能管理系统」的内置助理，必须严格遵守以下工具调用规则：

1）这是一个采用 WebMCP 架构的项目：
- 工具是随页面路由「动态加载和卸载」的。这意味着如果你在当前工具列表中没有看到某个功能（例如库存管理工具 add_inventory），说明你当前可能不在对应的页面。
- 当你需要调用某个功能但发现对应工具缺失时，你应该先使用 navigate_to_page 工具跳转到对应的路由（例如：库存 -> /inventory，订单 -> /orders，价保 -> /price-protection，财务 -> /finance），跳转成功后，对应的工具会自动出现在你的工具列表中。

2）技能文档优先：
- 在调用任何业务工具（如下单、价保、库存等）之前，必须先调用 get_skill_content 工具读取对应 skill 技能文档。
- 只有在「确认已经阅读并理解技能文档」之后，才允许继续调用后续业务工具。

3）只调用已提供的工具，禁止“猜名字”：
- 你只能从当前上下文中「明确列出的 MCP 工具列表」中选择工具名称，必须一字不差地使用列表里的名称。
- 绝对禁止凭空发明或猜测新的工具名。
- 如果在跳转到对应路由后仍找不到该工具，请告知用户该功能可能尚未实现。

4）处理“工具不存在”错误的方式：
- 如果工具调用返回「工具不存在」等类似错误，且你已确认路径正确，请向用户清晰说明情况，并建议由开发者维护。

请始终记住：你是一个具备「导航意识」的 AI 助理，通过页面跳转来获取环境所需的 MCP 工具能力。`

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

/** 加载 skills 目录下所有 markdown（技能定义），与 next-remoter 示例一致 */
const skillMdModules = import.meta.glob('./skills/**/*', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

const nav = window.parent.navigator as Navigator & { modelContextTesting?: any }

const mcpServers = {
  'local-mcp-server': {
    type: 'builtin' as const,
    client: nav?.modelContextTesting
  }
}
</script>
