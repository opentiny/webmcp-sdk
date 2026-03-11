import { z } from 'zod'
import type { PageAwareServer } from '@opentiny/next-sdk'

/** 注册价保管理相关工具，路由指向 /price-protection 页面 */
const registerPriceProtectionTools = (server: PageAwareServer) => {
  server.registerTool(
    'price-protection-query',
    {
      title: '查询价保申请',
      description: '查询商品价保申请列表，可按状态筛选（pending/approved/rejected/expired），不传 status 则返回全部',
      inputSchema: {
        status: z.enum(['pending', 'approved', 'rejected', 'expired']).optional().describe('申请状态，不传则查询全部')
      }
    },
    { route: '/price-protection' }
  )

  server.registerTool(
    'price-protection-review',
    {
      title: '审批价保申请',
      description: '对待审核的价保申请进行审批，支持通过（approve）或拒绝（reject），可附加备注',
      inputSchema: {
        id: z.union([z.number().int(), z.string().regex(/^\d+$/, '必须是纯数字 ID')]).describe('价保申请 ID'),
        action: z.enum(['approve', 'reject']).describe('审批动作：approve=通过，reject=拒绝'),
        remark: z.string().optional().describe('审批备注（可选）')
      }
    },
    { route: '/price-protection' }
  )

  server.registerTool(
    'price-protection-detail',
    {
      title: '价保申请详情',
      description: '根据申请 ID 获取单条价保申请的完整详情',
      inputSchema: {
        id: z.union([z.number().int(), z.string().regex(/^\d+$/, '必须是纯数字 ID')]).describe('价保申请 ID')
      }
    },
    { route: '/price-protection' }
  )
}

export default registerPriceProtectionTools
