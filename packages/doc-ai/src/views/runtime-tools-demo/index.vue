<template>
  <div class="runtime-tools-page">
    <div class="page-header">
      <h2>一体化工具示例</h2>
      <p class="subtitle">工具描述、参数 schema、执行回调都定义在当前页面文件中（非分裂模式）。</p>
    </div>

    <div class="card">
      <p class="tip">
        当前页面挂载后会动态注册两个 MCP 工具：
        <code>runtime_ticket_query</code> 和 <code>runtime_ticket_close</code>。离开页面时自动卸载。
      </p>
      <tiny-grid :data="ticketList" border>
        <tiny-grid-column type="index" width="60" />
        <tiny-grid-column field="id" title="工单号" width="140" />
        <tiny-grid-column field="title" title="问题描述" min-width="240" />
        <tiny-grid-column field="owner" title="负责人" width="120" />
        <tiny-grid-column field="status" title="状态" width="120">
          <template #default="{ row }">
            <tiny-tag :type="row.status === 'closed' ? 'success' : 'warning'">
              {{ row.status === 'closed' ? '已关闭' : '处理中' }}
            </tiny-tag>
          </template>
        </tiny-grid-column>
      </tiny-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { z } from '@opentiny/next-sdk'
import { server } from '../../mcp-servers'

type TicketItem = {
  id: string
  title: string
  owner: string
  status: 'open' | 'closed'
}

const ticketList = ref<TicketItem[]>([
  { id: 'RT-1001', title: '支付回调偶发超时', owner: '王丽', status: 'open' },
  { id: 'RT-1002', title: '库存锁定延迟释放', owner: '陈涛', status: 'open' },
  { id: 'RT-1003', title: '导出报表字段缺失', owner: '李航', status: 'closed' },
  { id: 'RT-1004', title: '退款审批流程卡住', owner: '赵敏', status: 'open' }
])



function registerRuntimeTools() {
  server.registerTool(
    'runtime_ticket_query',
    {
      title: '运行时工单查询',
      description: '【一体化页面工具】按关键词查询工单列表，演示 schema 与 handler 同文件定义。',
      inputSchema: {
        keyword: z.string().optional().describe('关键词，可匹配工单号、标题、负责人'),
        limit: z.number().int().positive().max(20).optional().describe('最多返回条数，默认 5')
      }
    },
    async ({ keyword, limit }: { keyword?: string; limit?: number }) => {
      const source = ticketList.value
      const key = (keyword ?? '').trim().toLowerCase()
      const matched = key
        ? source.filter(
            (item) =>
              item.id.toLowerCase().includes(key) ||
              item.title.toLowerCase().includes(key) ||
              item.owner.toLowerCase().includes(key)
          )
        : source
      const finalList = matched.slice(0, limit ?? 5)
      const text =
        finalList.length === 0
          ? '未查询到符合条件的工单。'
          : `查询到 ${finalList.length} 条工单：\n${finalList
              .map((item) => `- ${item.id} | ${item.title} | ${item.owner} | ${item.status}`)
              .join('\n')}`
      return { content: [{ type: 'text', text }] }
    }
  )

  server.registerTool(
    'runtime_ticket_close',
    {
      title: '运行时工单关闭',
      description: '【一体化页面工具】按工单号关闭工单并返回结果。',
      inputSchema: {
        id: z.string().describe('工单号，例如 RT-1002')
      }
    },
    async ({ id }: { id: string }) => {
      const source = ticketList.value
      const item = source.find((ticket) => ticket.id === id)
      if (!item) {
        return { content: [{ type: 'text', text: `未找到工单 ${id}。` }] }
      }
      if (item.status === 'closed') {
        return { content: [{ type: 'text', text: `工单 ${id} 已是关闭状态。` }] }
      }
      item.status = 'closed'
      return { content: [{ type: 'text', text: `工单 ${id} 已成功关闭。` }] }
    }
  })
}

onMounted(() => {
  registerRuntimeTools()
})

onUnmounted(() => {
  const runtimeToolNames = ['runtime_ticket_query', 'runtime_ticket_close']
  runtimeToolNames.forEach((toolName) => {
    server.unregisterTool(toolName)
  })
})
</script>

<style scoped>
.runtime-tools-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fadeIn 0.35s ease;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 1.4rem;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.tip {
  margin: 0 0 12px;
  font-size: 0.88rem;
  color: #4b5563;
}

code {
  background: #f3f4f6;
  border-radius: 4px;
  padding: 1px 6px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
