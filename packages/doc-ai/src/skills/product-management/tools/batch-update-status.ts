import type { WebMcpServer } from '@opentiny/next-sdk'
import { z } from '@opentiny/next-sdk'
import type { Product, BatchUpdateStatusInput, BatchOperationResult } from '../types'

/**
 * 注册批量更新状态工具
 */
export function registerBatchUpdateStatus(
  server: WebMcpServer,
  getProducts: () => Product[],
  setProducts: (products: Product[]) => void
) {
  server.registerTool(
    'batch_update_status',
    {
      title: '批量更新商品状态',
      description: '批量上架或下架商品，支持最多100个商品同时操作。返回操作结果统计。',
      inputSchema: {
        ids: z.array(z.string()).min(1).max(100).describe('商品ID数组，最多100个'),
        status: z.enum(['on', 'off']).describe('目标状态：on-上架, off-下架')
      }
    },
    async (input: BatchUpdateStatusInput) => {
      try {
        // 验证
        if (input.ids.length === 0) {
          throw new Error('商品ID列表不能为空')
        }
        if (input.ids.length > 100) {
          throw new Error('单次最多支持100个商品，当前: ' + input.ids.length)
        }

        const products = getProducts()
        const results: BatchOperationResult['results'] = []
        let updated = 0
        let failed = 0

        // 批量更新
        input.ids.forEach((id) => {
          const product = products.find((p) => p.id === id)

          if (!product) {
            results.push({
              id,
              success: false,
              error: 'PRODUCT_NOT_FOUND'
            })
            failed++
            return
          }

          // 更新状态
          product.status = input.status
          product.updatedAt = new Date().toISOString()

          results.push({
            id,
            success: true
          })
          updated++
        })

        // 保存更新
        setProducts(products)

        const result: BatchOperationResult = {
          success: updated > 0,
          updated,
          failed,
          results,
          message: `批量更新完成：成功 ${updated} 个，失败 ${failed} 个`
        }

        let message = `✓ 批量更新状态完成\n` + `📊 操作结果：\n` + `  - 成功: ${updated} 个\n` + `  - 失败: ${failed} 个\n` + `  - 目标状态: ${input.status === 'on' ? '上架' : '下架'}\n`

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
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ 批量更新失败：${error instanceof Error ? error.message : '未知错误'}`
            }
          ],
          isError: true
        }
      }
    }
  )
}
