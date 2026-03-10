import { z } from '@opentiny/next-sdk'
import type { PageAwareServer } from '@opentiny/next-sdk'

export default function registerInventoryTools(server: PageAwareServer) {
  server.registerTool(
    'add_inventory',
    {
      description: '【入库管理工具】帮助电商管理员将采购的商品新增入库存系统中',
      inputSchema: {
        productName: z.string().describe('商品名称或型号，如：iPhone 15 Pro Max'),
        quantity: z.number().describe('要入库的数量，必须大于0'),
        warehouse: z.string().describe('入库存放的仓库名称，如：北京一号仓')
      }
    },
    { route: '/inventory' }
  )

  // 可以预留其他库存相关工具，如 inventory_query 等
}
