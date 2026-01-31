import type { WebMcpServer } from '@opentiny/next-sdk'
import { z } from '@opentiny/next-sdk'
import type { Product, AddProductInput } from '../types'

/**
 * 注册添加商品工具
 */
export function registerAddProduct(
  server: WebMcpServer,
  getProducts: () => Product[],
  setProducts: (products: Product[]) => void
) {
  server.registerTool(
    'add_product',
    {
      title: '添加新商品',
      description: '创建一个新商品，需要提供商品名称、价格、库存、分类等信息。价格必须大于0，库存必须大于等于0。',
      inputSchema: {
        name: z.string().min(1).max(100).describe('商品名称，1-100个字符'),
        price: z.number().positive().describe('商品价格（元），必须大于0'),
        stock: z.number().int().min(0).describe('库存数量，必须大于等于0的整数'),
        category: z.enum(['phones', 'laptops', 'tablets']).describe('商品分类'),
        status: z.enum(['on', 'off']).optional().default('on').describe('商品状态，默认为上架(on)'),
        description: z.string().max(500).optional().describe('商品描述，最多500字符'),
        image: z.string().url().optional().describe('商品图片URL')
      }
    },
    async (input: AddProductInput) => {
      try {
        // 数据验证
        if (input.price <= 0) {
          throw new Error('价格必须大于0')
        }
        if (input.stock < 0) {
          throw new Error('库存不能为负数')
        }
        if (!input.name.trim()) {
          throw new Error('商品名称不能为空')
        }

        const products = getProducts()

        // 生成新ID
        const maxId = products.length > 0 ? Math.max(...products.map((p) => parseInt(p.id))) : 0
        const newId = (maxId + 1).toString()

        // 创建新商品
        const now = new Date().toISOString()
        const newProduct: Product = {
          id: newId,
          name: input.name,
          price: Math.round(input.price * 100) / 100, // 保留两位小数
          stock: input.stock,
          category: input.category,
          status: input.status || 'on',
          description: input.description,
          image: input.image,
          createdAt: now,
          updatedAt: now
        }

        // 添加到商品列表
        products.push(newProduct)
        setProducts(products)

        const message = `✓ 商品添加成功！\n` + `📦 商品信息：\n` + `  - ID: ${newProduct.id}\n` + `  - 名称: ${newProduct.name}\n` + `  - 价格: ¥${newProduct.price}\n` + `  - 库存: ${newProduct.stock} 件\n` + `  - 分类: ${newProduct.category}\n` + `  - 状态: ${newProduct.status === 'on' ? '上架' : '下架'}`

        return {
          content: [
            {
              type: 'text',
              text: message
            },
            {
              type: 'text',
              text: JSON.stringify(newProduct, null, 2)
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ 添加商品失败：${error instanceof Error ? error.message : '未知错误'}`
            }
          ],
          isError: true
        }
      }
    }
  )
}
