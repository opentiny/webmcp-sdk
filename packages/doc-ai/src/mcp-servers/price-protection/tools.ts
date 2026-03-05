import { z } from '@opentiny/next-sdk'
import type { PageAwareServer } from '@opentiny/next-sdk'

const registerPriceProtectionTools = (server: PageAwareServer) => {
  // 查询价保申请列表，支持按状态过滤
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

  // 审批价保申请（通过或拒绝）
  server.registerTool(
    'price-protection-review',
    {
      title: '审批价保申请',
      description: '对待审核的价保申请进行审批，支持通过（approve）或拒绝（reject），可附加备注',
      inputSchema: {
        id: z.number().describe('价保申请 ID'),
        action: z.enum(['approve', 'reject']).describe('审批动作：approve=通过，reject=拒绝'),
        remark: z.string().optional().describe('审批备注（可选）')
      }
    },
    { route: '/price-protection' }
  )

  // 获取单条价保申请详情
  server.registerTool(
    'price-protection-detail',
    {
      title: '价保申请详情',
      description: '根据申请 ID 获取单条价保申请的完整详情',
      inputSchema: {
        id: z.number().describe('价保申请 ID')
      }
    },
    { route: '/price-protection' }
  )
}

export default registerPriceProtectionTools
