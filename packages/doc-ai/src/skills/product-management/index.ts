import type { WebMcpServer } from '@opentiny/next-sdk'
import type { Product } from './types'
import { registerQueryProducts } from './tools/query-products'
import { registerAddProduct } from './tools/add-product'
import { registerBatchUpdateStatus } from './tools/batch-update-status'
import { registerBatchAdjustPrice } from './tools/batch-adjust-price'
import { registerGetInventoryReport } from './tools/get-inventory-report'

/**
 * 注册商品管理相关的所有 MCP 工具
 * @param server - Web MCP Server 实例
 * @param getProducts - 获取商品列表的函数
 * @param setProducts - 设置商品列表的函数
 */
export function registerProductManagementTools(
  server: WebMcpServer,
  getProducts: () => Product[],
  setProducts: (products: Product[]) => void
) {
  console.log('[Product Management] 开始注册 MCP 工具...')

  // 1. 查询商品
  registerQueryProducts(server, getProducts)
  console.log('[Product Management] ✓ query_products 已注册')

  // 2. 添加商品
  registerAddProduct(server, getProducts, setProducts)
  console.log('[Product Management] ✓ add_product 已注册')

  // 3. 批量更新状态
  registerBatchUpdateStatus(server, getProducts, setProducts)
  console.log('[Product Management] ✓ batch_update_status 已注册')

  // 4. 批量调整价格
  registerBatchAdjustPrice(server, getProducts, setProducts)
  console.log('[Product Management] ✓ batch_adjust_price 已注册')

  // 5. 获取库存报告
  registerGetInventoryReport(server, getProducts)
  console.log('[Product Management] ✓ get_inventory_report 已注册')

  console.log('[Product Management] 所有工具注册完成！')
}

// 导出类型
export * from './types'
