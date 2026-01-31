import type { WebMcpServer } from '@opentiny/next-sdk'
import { z } from '@opentiny/next-sdk'
import type { Product, QueryProductsInput, QueryProductsResult } from '../types'

/**
 * 注册商品查询工具
 */
export function registerQueryProducts(server: WebMcpServer, getProducts: () => Product[]) {
  server.registerTool(
    'query_products',
    {
      title: '查询商品列表',
      description:
        '根据条件查询商品，支持按分类、状态、价格区间筛选，以及低库存商品查询。返回商品列表和统计信息。',
      inputSchema: {
        category: z
          .enum(['phones', 'laptops', 'tablets'])
          .optional()
          .describe('商品分类：phones-手机, laptops-笔记本, tablets-平板'),
        status: z.enum(['on', 'off']).optional().describe('商品状态：on-上架, off-下架'),
        minPrice: z.number().positive().optional().describe('最低价格（元），必须为正数'),
        maxPrice: z.number().positive().optional().describe('最高价格（元），必须为正数'),
        lowStock: z.boolean().optional().describe('是否只查询低库存商品（库存 < 10）'),
        keyword: z.string().optional().describe('搜索关键词，匹配商品名称'),
        sortBy: z.enum(['price', 'stock', 'name']).optional().describe('排序字段'),
        sortOrder: z.enum(['asc', 'desc']).optional().describe('排序顺序：asc-升序, desc-降序')
      }
    },
    async (input: QueryProductsInput) => {
      try {
        let products = [...getProducts()] // 复制一份避免修改原数据

        // 应用筛选条件
        if (input.category) {
          products = products.filter((p) => p.category === input.category)
        }
        if (input.status) {
          products = products.filter((p) => p.status === input.status)
        }
        if (input.minPrice !== undefined) {
          products = products.filter((p) => p.price >= input.minPrice!)
        }
        if (input.maxPrice !== undefined) {
          products = products.filter((p) => p.price <= input.maxPrice!)
        }
        if (input.lowStock) {
          products = products.filter((p) => p.stock < 10)
        }
        if (input.keyword) {
          const keyword = input.keyword.toLowerCase()
          products = products.filter((p) => p.name.toLowerCase().includes(keyword))
        }

        // 应用排序
        if (input.sortBy) {
          const order = input.sortOrder === 'desc' ? -1 : 1
          products.sort((a, b) => {
            const aVal = a[input.sortBy!]
            const bVal = b[input.sortBy!]
            if (typeof aVal === 'string') {
              return aVal.localeCompare(bVal as string) * order
            }
            return ((aVal as number) - (bVal as number)) * order
          })
        }

        // 计算统计信息
        const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)
        const avgPrice = products.length > 0 ? products.reduce((sum, p) => sum + p.price, 0) / products.length : 0
        const totalStock = products.reduce((sum, p) => sum + p.stock, 0)

        const result: QueryProductsResult = {
          products,
          total: products.length,
          summary: {
            totalValue: Math.round(totalValue * 100) / 100,
            avgPrice: Math.round(avgPrice * 100) / 100,
            totalStock
          }
        }

        // 生成详细的文本反馈
        let message = `✓ 查询成功，找到 ${result.total} 个商品\n`
        message += `📊 统计信息：\n`
        message += `  - 总库存价值：¥${result.summary.totalValue.toLocaleString()}\n`
        message += `  - 平均价格：¥${result.summary.avgPrice.toLocaleString()}\n`
        message += `  - 总库存数量：${result.summary.totalStock} 件\n`

        if (products.length > 0) {
          message += `\n📦 商品列表（前10个）：\n`
          products.slice(0, 10).forEach((p, i) => {
            message += `${i + 1}. ${p.name}\n`
            message += `   价格: ¥${p.price} | 库存: ${p.stock} | 状态: ${p.status === 'on' ? '上架' : '下架'}\n`
          })
          if (products.length > 10) {
            message += `\n...还有 ${products.length - 10} 个商品未显示`
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: message
            },
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ 查询失败：${error instanceof Error ? error.message : '未知错误'}`
            }
          ],
          isError: true
        }
      }
    }
  )
}
