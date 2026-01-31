import type { WebMcpServer } from '@opentiny/next-sdk'
import { z } from '@opentiny/next-sdk'
import type { Product, BatchAdjustPriceInput } from '../types'

/**
 * 注册批量调整价格工具
 */
export function registerBatchAdjustPrice(
  server: WebMcpServer,
  getProducts: () => Product[],
  setProducts: (products: Product[]) => void
) {
  server.registerTool(
    'batch_adjust_price',
    {
      title: '批量调整商品价格',
      description:
        '批量调整商品价格，支持百分比调整(如降价10%: -0.1)和固定金额调整(如涨价100元: 100)。调整后价格不能低于0.01元。',
      inputSchema: {
        ids: z.array(z.string()).min(1).max(100).describe('商品ID数组，最多100个'),
        adjustType: z.enum(['percent', 'fixed']).describe('调整方式：percent-百分比, fixed-固定金额'),
        adjustValue: z.number().describe('调整值。百分比用小数表示(如-0.1表示降价10%)，固定金额用实际数值(如-100表示降价100元)')
      }
    },
    async (input: BatchAdjustPriceInput) => {
      try {
        // 验证
        if (input.ids.length === 0) {
          throw new Error('商品ID列表不能为空')
        }
        if (input.ids.length > 100) {
          throw new Error('单次最多支持100个商品')
        }
        if (input.adjustType === 'percent' && Math.abs(input.adjustValue) > 1) {
          throw new Error('百分比调整建议在 -100% 到 +100% 之间（即 -1 到 1）')
        }

        const products = getProducts()
        const results: Array<{
          id: string
          oldPrice: number
          newPrice: number
          success: boolean
          error?: string
        }> = []
        let updated = 0
        let failed = 0
        let totalPriceChange = 0

        // 批量调价
        input.ids.forEach((id) => {
          const product = products.find((p) => p.id === id)

          if (!product) {
            results.push({
              id,
              oldPrice: 0,
              newPrice: 0,
              success: false,
              error: 'PRODUCT_NOT_FOUND'
            })
            failed++
            return
          }

          const oldPrice = product.price
          let newPrice: number

          // 计算新价格
          if (input.adjustType === 'percent') {
            newPrice = oldPrice * (1 + input.adjustValue)
          } else {
            newPrice = oldPrice + input.adjustValue
          }

          // 价格保留两位小数
          newPrice = Math.round(newPrice * 100) / 100

          // 验证新价格
          if (newPrice < 0.01) {
            results.push({
              id,
              oldPrice,
              newPrice: 0,
              success: false,
              error: 'INVALID_PRICE: 价格不能低于 ¥0.01'
            })
            failed++
            return
          }

          // 更新价格
          product.price = newPrice
          product.updatedAt = new Date().toISOString()

          const priceChange = newPrice - oldPrice
          totalPriceChange += priceChange

          results.push({
            id,
            oldPrice,
            newPrice,
            success: true
          })
          updated++
        })

        // 保存更新
        setProducts(products)

        const avgPriceChange = updated > 0 ? totalPriceChange / updated : 0

        let message = `✓ 批量调价完成\n` + `📊 操作结果：\n` + `  - 成功: ${updated} 个\n` + `  - 失败: ${failed} 个\n` + `  - 调整方式: ${input.adjustType === 'percent' ? `百分比 ${(input.adjustValue * 100).toFixed(1)}%` : `固定金额 ${input.adjustValue > 0 ? '+' : ''}¥${input.adjustValue}`}\n` + `  - 平均价格变化: ${avgPriceChange > 0 ? '+' : ''}¥${avgPriceChange.toFixed(2)}\n`

        if (updated > 0) {
          message += `\n💰 价格变化示例（前5个）：\n`
          results
            .filter((r) => r.success)
            .slice(0, 5)
            .forEach((r) => {
              const change = r.newPrice - r.oldPrice
              message += `  - ID ${r.id}: ¥${r.oldPrice} → ¥${r.newPrice} (${change > 0 ? '+' : ''}¥${change.toFixed(2)})\n`
            })
        }

        if (failed > 0) {
          message += `\n❌ 失败的商品：\n`
          results
            .filter((r) => !r.success)
            .forEach((r) => {
              message += `  - ID ${r.id}: ${r.error}\n`
            })
        }

        return {
          content: [
            {
              type: 'text',
              text: message
            },
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: updated > 0,
                  updated,
                  failed,
                  results,
                  summary: {
                    totalPriceChange: Math.round(totalPriceChange * 100) / 100,
                    avgPriceChange: Math.round(avgPriceChange * 100) / 100
                  }
                },
                null,
                2
              )
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ 批量调价失败：${error instanceof Error ? error.message : '未知错误'}`
            }
          ],
          isError: true
        }
      }
    }
  )
}
