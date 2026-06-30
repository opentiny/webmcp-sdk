import { Component, OnInit, OnDestroy, signal } from '@angular/core'
import { CommonModule } from '@angular/common'

const SALES_RECORD_QUERY_TOOL = 'sales_record_query'

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss'
})
export class SalesComponent implements OnInit, OnDestroy {
  activeRange = signal('30days')

  statCards = [
    {
      label: '总销售额',
      value: '¥128,450',
      change: '12.5%',
      up: true,
      icon: '💰',
      iconBg: '#e8f4fd'
    },
    {
      label: '订单数量',
      value: '1,245',
      change: '8.2%',
      up: true,
      icon: '📦',
      iconBg: '#e8ffea'
    },
    {
      label: '平均客单价',
      value: '¥103',
      change: '3.1%',
      up: false,
      icon: '👥',
      iconBg: '#fff3e8'
    },
    {
      label: '转化率',
      value: '24.8%',
      change: '5.7%',
      up: true,
      icon: '📈',
      iconBg: '#f2e8ff'
    }
  ]

  topProducts = [
    {
      name: 'iPhone 15 Pro Max',
      category: '手机',
      qty: 245,
      revenue: 2450000,
      ratio: 35,
      color: '#6366f1'
    },
    {
      name: 'MacBook Pro M3',
      category: '笔记本',
      qty: 89,
      revenue: 2200000,
      ratio: 28,
      color: '#00b42a'
    },
    {
      name: 'AirPods Pro 2',
      category: '耳机',
      qty: 156,
      revenue: 280000,
      ratio: 20,
      color: '#ff7d00'
    },
    {
      name: 'iPad Pro',
      category: '平板',
      qty: 67,
      revenue: 600000,
      ratio: 12,
      color: '#f53f3f'
    },
    {
      name: 'Apple Watch',
      category: '智能穿戴',
      qty: 45,
      revenue: 225000,
      ratio: 5,
      color: '#86909c'
    }
  ]

  ngOnInit() {
    const modelContext = (document as any).modelContext || (navigator as any).modelContext
    modelContext.registerTool({
      name: SALES_RECORD_QUERY_TOOL,
      title: '查询销售记录',
      description: '【销售分析工具】查询商品销售记录，支持按时间范围筛选，返回销售趋势图表与数据总览。',
      inputSchema: {
        type: 'object',
        properties: {
          timeRange: {
            type: 'string',
            enum: ['7days', '30days', 'year'],
            description: '查询时间范围'
          }
        }
      },
      execute: async (params: { timeRange?: string }) => {
        const range = params.timeRange || '30days'
        this.activeRange.set(range)

        const rangeLabel =
          {
            '7days': '近7天',
            '30days': '近30天',
            'year': '全年'
          }[range] || '近30天'

        const text = `已为您切换到${rangeLabel}销售记录视图。当前数据显示：
- 总销售额：¥128,450（较上月增长12.5%）
- 订单数量：1,245笔（较上月增长8.2%）
- 平均客单价：¥103（较上月下降3.1%）
- 转化率：24.8%（较上月增长5.7%）

热销商品前三名：
1. iPhone 15 Pro Max - ¥2,450,000 (35%)
2. MacBook Pro M3 - ¥2,200,000 (28%)
3. AirPods Pro 2 - ¥280,000 (20%)

详细图表已在左侧界面展示，可点击不同时间标签查看更多数据。`
        return { content: [{ type: 'text', text }] }
      }
    })
  }

  ngOnDestroy() {
    const modelContext = (document as any).modelContext || (navigator as any).modelContext
    modelContext.unregisterTool(SALES_RECORD_QUERY_TOOL)
  }

  setActiveRange(range: string) {
    this.activeRange.set(range)
  }
}
