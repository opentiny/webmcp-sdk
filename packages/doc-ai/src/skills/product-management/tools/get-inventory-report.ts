import type { WebMcpServer } from '@opentiny/next-sdk'
import type { Product, InventoryReport } from '../types'
import { categoryLabels } from '../types'

/**
 * 注册获取库存报告工具
 */
export function registerGetInventoryReport(server: WebMcpServer, getProducts: () => Product[]) {
  server.registerTool(
    'get_inventory_report',
    {
      title: '获取库存报告',
      description: '生成详细的库存分析报告，包括库存统计、低库存预警、高价值商品、分类统计等信息，并提供操作建议。'
    },
    async () => {
      try {
        const products = getProducts()

        if (products.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '⚠️ 当前没有商品数据'
              }
            ]
          }
        }

        // 计算总体统计
        const totalProducts = products.length
        const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)
        const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
        const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / totalProducts
        const avgStock = totalStock / totalProducts

        // 低库存商品（库存 < 10）
        const lowStock = products.filter((p) => p.stock < 10).sort((a, b) => a.stock - b.stock)

        // 高价值商品（前10）
        const highValue = products
          .map((p) => ({
            ...p,
            totalValue: p.price * p.stock
          }))
          .sort((a, b) => b.totalValue - a.totalValue)
          .slice(0, 10)

        // 按分类统计
        const byCategory: InventoryReport['byCategory'] = {}
        products.forEach((p) => {
          if (!byCategory[p.category]) {
            byCategory[p.category] = {
              count: 0,
              totalValue: 0,
              avgPrice: 0
            }
          }
          byCategory[p.category].count++
          byCategory[p.category].totalValue += p.price * p.stock
        })
        // 计算每个分类的平均价格
        Object.keys(byCategory).forEach((cat) => {
          const categoryProducts = products.filter((p) => p.category === cat)
          byCategory[cat].avgPrice = categoryProducts.reduce((sum, p) => sum + p.price, 0) / categoryProducts.length
        })

        // 按状态统计
        const byStatus = {
          on: products.filter((p) => p.status === 'on').length,
          off: products.filter((p) => p.status === 'off').length
        }

        // 生成操作建议
        const recommendations: string[] = []
        if (lowStock.length > 0) {
          recommendations.push(`⚠️ 有 ${lowStock.length} 个商品库存不足（< 10），建议及时补货`)
        }
        if (byStatus.off > totalProducts * 0.3) {
          recommendations.push(`📊 有 ${byStatus.off} 个商品处于下架状态，占比较高`)
        }
        const zeroStock = products.filter((p) => p.stock === 0)
        if (zeroStock.length > 0) {
          recommendations.push(`❗ 有 ${zeroStock.length} 个商品库存为0，建议下架或标记预售`)
        }
        if (recommendations.length === 0) {
          recommendations.push('✓ 库存状态良好，无紧急问题')
        }

        const report: InventoryReport = {
          timestamp: new Date().toISOString(),
          summary: {
            totalProducts,
            totalValue: Math.round(totalValue * 100) / 100,
            totalStock,
            avgPrice: Math.round(avgPrice * 100) / 100,
            avgStock: Math.round(avgStock * 100) / 100
          },
          lowStock,
          highValue,
          byCategory,
          byStatus,
          recommendations
        }

        // 生成友好的文本报告
        let message = `📊 库存分析报告\n`
        message += `🕐 生成时间：${new Date().toLocaleString('zh-CN')}\n\n`

        message += `📈 总体统计：\n`
        message += `  - 商品总数：${totalProducts} 个\n`
        message += `  - 库存总价值：¥${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
        message += `  - 总库存数量：${totalStock} 件\n`
        message += `  - 平均价格：¥${avgPrice.toFixed(2)}\n`
        message += `  - 平均库存：${avgStock.toFixed(1)} 件\n\n`

        message += `📦 商品状态：\n`
        message += `  - 上架商品：${byStatus.on} 个 (${((byStatus.on / totalProducts) * 100).toFixed(1)}%)\n`
        message += `  - 下架商品：${byStatus.off} 个 (${((byStatus.off / totalProducts) * 100).toFixed(1)}%)\n\n`

        message += `🏷️ 分类统计：\n`
        Object.entries(byCategory).forEach(([cat, stat]) => {
          const label = categoryLabels[cat as keyof typeof categoryLabels] || cat
          message += `  - ${label}：${stat.count} 个，总值 ¥${stat.totalValue.toFixed(2)}，均价 ¥${stat.avgPrice.toFixed(2)}\n`
        })
        message += `\n`

        if (lowStock.length > 0) {
          message += `⚠️ 低库存商品（${lowStock.length} 个）：\n`
          lowStock.slice(0, 10).forEach((p) => {
            message += `  - ${p.name}：剩余 ${p.stock} 件\n`
          })
          if (lowStock.length > 10) {
            message += `  ...还有 ${lowStock.length - 10} 个商品\n`
          }
          message += `\n`
        }

        message += `💎 高价值商品（前5）：\n`
        highValue.slice(0, 5).forEach((p, i) => {
          message += `  ${i + 1}. ${p.name}：¥${p.price} × ${p.stock} = ¥${p.totalValue.toFixed(2)}\n`
        })
        message += `\n`

        message += `💡 操作建议：\n`
        recommendations.forEach((r) => {
          message += `  ${r}\n`
        })

        return {
          content: [
            {
              type: 'text',
              text: message
            },
            {
              type: 'text',
              text: JSON.stringify(report, null, 2)
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ 生成库存报告失败：${error instanceof Error ? error.message : '未知错误'}`
            }
          ],
          isError: true
        }
      }
    }
  )
}
