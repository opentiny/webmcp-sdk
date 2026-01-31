import { ref } from 'vue'
import { WebMcpServer, z } from '@opentiny/next-sdk'
import { useSkillsManager } from './useSkillsManager'
import type { WebSkill } from './useSkillsManager'
import { registerProductManagementTools } from '../skills/product-management'
import type { Product } from '../skills/product-management'

// 导入子文档内容
import SKILL_MD from '../skills/product-management/SKILL.md?raw'
import API_REFERENCE_MD from '../skills/product-management/docs/api-reference.md?raw'
import BUSINESS_RULES_MD from '../skills/product-management/docs/business-rules.md?raw'
import EXAMPLES_MD from '../skills/product-management/docs/examples.md?raw'

/**
 * 商品管理 MCP Server 的 Composable
 * 整合 Web-Skills 和 Web-MCP
 */
export function useProductMcp(mcpServer: WebMcpServer) {
  const { manager } = useSkillsManager(mcpServer)

  // 商品数据（使用 ref 以便响应式更新）
  const products = ref<Product[]>([])

  /**
   * 初始化：注册 Skill 和 MCP 工具
   */
  const initialize = async () => {
    console.log('[useProductMcp] 开始初始化...')

    // 1. 注册商品管理 Skill
    const productSkill: WebSkill = {
      id: 'product-management',
      metadata: {
        name: 'product-management-skill',
        description: '商品管理系统的智能辅助，提供商品增删改查、库存管理、批量操作等能力',
        version: '1.0.0',
        author: 'zzcr',
        category: 'business',
        tags: ['e-commerce', 'product', 'crud', 'inventory'],
        license: 'MIT'
      },
      content: SKILL_MD,
      subDocs: new Map([
        [
          'api-reference',
          {
            docId: 'api-reference',
            source: 'memory',
            content: API_REFERENCE_MD
          }
        ],
        [
          'business-rules',
          {
            docId: 'business-rules',
            source: 'memory',
            content: BUSINESS_RULES_MD
          }
        ],
        [
          'examples',
          {
            docId: 'examples',
            source: 'memory',
            content: EXAMPLES_MD
          }
        ]
      ]),
      mcpTools: [
        'query_products',
        'add_product',
        'update_product',
        'delete_product',
        'batch_update_status',
        'batch_adjust_price',
        'batch_adjust_stock',
        'get_inventory_report',
        'read_memory_doc',
        'list_skills'
      ]
    }

    await manager.registerSkill(productSkill)
    console.log('[useProductMcp] ✓ Skill 注册成功')

    // 2. 注册 Web MCP 工具 - 文档读取
    mcpServer.registerTool(
      'read_memory_doc',
      {
        title: '读取 Skill 子文档',
        description:
          '从内存中读取 Skill 的子文档内容。格式: "skillId:docId"，例如 "product-management:api-reference"',
        inputSchema: {
          docPath: z
            .string()
            .describe('文档路径，格式: skillId:docId，例如 "product-management:api-reference"')
        }
      },
      async ({ docPath }: { docPath: string }) => {
        try {
          const [skillId, docId] = docPath.split(':')
          if (!skillId || !docId) {
            throw new Error('文档路径格式错误，应为: skillId:docId')
          }

          const content = await manager.loadSubDoc(skillId, docId)
          return {
            content: [
              {
                type: 'text',
                text: content
              }
            ]
          }
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ 读取文档失败：${error instanceof Error ? error.message : '未知错误'}`
              }
            ],
            isError: true
          }
        }
      }
    )
    console.log('[useProductMcp] ✓ read_memory_doc 工具已注册')

    // 2b. 从 CDN 读取文档（替代 Web 端无文件系统，用远端 Markdown 披露子文档）
    mcpServer.registerTool(
      'read_cdn_doc',
      {
        title: '从 CDN 读取 Skill 文档',
        description:
          '从云端 CDN 地址拉取 Markdown 文档内容，用于读取托管在 CDN 上的 Skill 子文档。Web 端无文件系统，可用此工具替代「读文件」。',
        inputSchema: {
          url: z.string().describe('CDN 文档的完整 URL，需返回可读的文本（如 .md）')
        }
      },
      async ({ url }: { url: string }) => {
        try {
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          const content = await response.text()
          return {
            content: [
              {
                type: 'text',
                text: content
              }
            ]
          }
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ 从 CDN 读取文档失败：${error instanceof Error ? error.message : '未知错误'}`
              }
            ],
            isError: true
          }
        }
      }
    )
    console.log('[useProductMcp] ✓ read_cdn_doc 工具已注册')

    // 3. 注册 Web MCP 工具 - 列出 Skills
    mcpServer.registerTool(
      'list_skills',
      {
        title: '列出所有可用的 Skills',
        description: '列出当前已注册的所有 Web Skills，包括名称、描述、分类等元数据信息'
      },
      async () => {
        const skills = manager.listSkills()
        const skillsList = skills.map((s) => ({
          id: s.id,
          name: s.metadata.name,
          description: s.metadata.description,
          version: s.metadata.version,
          category: s.metadata.category,
          tags: s.metadata.tags,
          mcpTools: s.mcpTools
        }))

        let message = `📚 已注册的 Skills (${skills.length} 个)：\n\n`
        skills.forEach((s) => {
          message += `• ${s.metadata.name}\n`
          message += `  ID: ${s.id}\n`
          message += `  描述: ${s.metadata.description}\n`
          message += `  版本: ${s.metadata.version}\n`
          message += `  分类: ${s.metadata.category || '未分类'}\n`
          if (s.mcpTools && s.mcpTools.length > 0) {
            message += `  关联工具: ${s.mcpTools.length} 个\n`
          }
          message += `\n`
        })

        return {
          content: [
            {
              type: 'text',
              text: message
            },
            {
              type: 'text',
              text: JSON.stringify(skillsList, null, 2)
            }
          ]
        }
      }
    )
    console.log('[useProductMcp] ✓ list_skills 工具已注册')

    // 4. 注册商品管理的业务工具
    registerProductManagementTools(
      mcpServer,
      () => products.value,
      (newProducts) => {
        products.value = newProducts
      }
    )
    console.log('[useProductMcp] ✓ 商品管理工具已注册')

    console.log('[useProductMcp] 初始化完成！')
  }

  /**
   * 加载商品数据
   */
  const loadProducts = (initialProducts: Product[]) => {
    products.value = initialProducts
    console.log(`[useProductMcp] 已加载 ${products.value.length} 个商品`)
  }

  /**
   * 获取 Skill 内容（用于展示）
   */
  const getSkillContent = () => {
    return manager.getSkillContent('product-management')
  }

  /**
   * 获取统计信息
   */
  const getStats = () => {
    return {
      skillsCount: manager.listSkills().length,
      productsCount: products.value.length,
      totalValue: products.value.reduce((sum, p) => sum + p.price * p.stock, 0)
    }
  }

  return {
    initialize,
    loadProducts,
    getSkillContent,
    getStats,
    products,
    manager
  }
}
