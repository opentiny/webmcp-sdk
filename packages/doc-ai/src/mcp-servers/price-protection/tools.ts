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
        id: z.union([z.string(), z.number()]).describe('价保申请 ID'),
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
        id: z.union([z.string(), z.number()]).describe('价保申请 ID')
      }
    },
    { route: '/price-protection' }
  )

  // 新增价保申请
  server.registerTool(
    'add_price_protection',
    {
      title: '申请价保补偿',
      description:
        '【价保监控工具】帮助电商管理员处理顾客因降价提出的补差价请求（价保申请）。注意：在调用本工具前，你必须先使用 get_skill_content 工具读取相关的技能文档，严禁凭空构造参数或跳过业务规则直接调用。',
      inputSchema: {
        customerName: z.string().describe('提出价保申请的顾客姓名'),
        orderId: z.string().describe('需要价保补偿的原订单编号'),
        amount: z.number().describe('申请补偿的差价金额'),
        reason: z.string().describe('顾客申请价保的原因')
      }
    },
    { route: '/price-protection' }
  )
}

export default registerPriceProtectionTools
