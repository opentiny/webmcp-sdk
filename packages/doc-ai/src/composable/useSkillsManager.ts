import { ref, reactive } from 'vue'
import type { WebMcpServer } from '@opentiny/next-sdk'

/**
 * Web Skill 接口定义
 */
export interface WebSkill {
  id: string // Skill 唯一标识
  metadata: {
    name: string // Skill 名称
    description: string // Skill 描述
    version: string // 版本号
    author?: string // 作者
    category?: string // 分类
    tags?: string[] // 标签
    license?: string // 许可证
  }
  content: string // 主文档内容 (Markdown)
  subDocs: Map<
    string,
    {
      docId: string // 文档ID
      source: 'memory' | 'cdn' // 来源类型
      path?: string // CDN 路径
      content?: string // 内存内容
    }
  >
  mcpTools?: string[] // 关联的 MCP 工具列表
}

/**
 * Skills Manager - 管理所有 Web Skills
 * 提供注册、卸载、查询等能力
 */
export class SkillsManager {
  private skills = reactive(new Map<string, WebSkill>()) // 技能注册表
  private mcpServer?: WebMcpServer // MCP 服务器实例
  private cdnCache = new Map<string, string>() // CDN 文档缓存

  constructor(mcpServer?: WebMcpServer) {
    this.mcpServer = mcpServer
  }

  /**
   * 注册一个新的 Skill
   */
  async registerSkill(skill: WebSkill): Promise<void> {
    // 验证 Skill 基本信息
    if (!skill.id || !skill.metadata.name) {
      throw new Error('Skill 必须包含 id 和 name')
    }

    // 检查是否已存在
    if (this.skills.has(skill.id)) {
      console.warn(`[SkillsManager] Skill ${skill.id} 已存在，将被覆盖`)
    }

    // 注册到内存
    this.skills.set(skill.id, skill)

    console.log(`[SkillsManager] ✓ Skill 注册成功: ${skill.metadata.name} (${skill.id})`)
  }

  /**
   * 卸载指定的 Skill
   */
  unregisterSkill(skillId: string): boolean {
    const skill = this.skills.get(skillId)
    if (!skill) {
      console.warn(`[SkillsManager] Skill ${skillId} 不存在`)
      return false
    }

    this.skills.delete(skillId)
    console.log(`[SkillsManager] ✓ Skill 卸载成功: ${skill.metadata.name}`)
    return true
  }

  /**
   * 获取 Skill 主文档内容
   */
  getSkillContent(skillId: string): string | undefined {
    const skill = this.skills.get(skillId)
    return skill?.content
  }

  /**
   * 获取 Skill 元数据
   */
  getSkillMetadata(skillId: string): WebSkill['metadata'] | undefined {
    const skill = this.skills.get(skillId)
    return skill?.metadata
  }

  /**
   * 加载 Skill 的子文档
   * 支持从内存和 CDN 两种来源加载
   */
  async loadSubDoc(skillId: string, docId: string): Promise<string> {
    const skill = this.skills.get(skillId)
    if (!skill) {
      throw new Error(`Skill ${skillId} 不存在`)
    }

    const subDoc = skill.subDocs.get(docId)
    if (!subDoc) {
      throw new Error(`子文档 ${docId} 在 Skill ${skillId} 中不存在`)
    }

    // 从内存读取
    if (subDoc.source === 'memory' && subDoc.content) {
      return subDoc.content
    }

    // 从 CDN 读取
    if (subDoc.source === 'cdn' && subDoc.path) {
      // 检查缓存
      const cacheKey = `${skillId}:${docId}`
      if (this.cdnCache.has(cacheKey)) {
        return this.cdnCache.get(cacheKey)!
      }

      // 从 CDN 加载
      try {
        const response = await fetch(subDoc.path)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const content = await response.text()

        // 缓存结果
        this.cdnCache.set(cacheKey, content)
        return content
      } catch (error) {
        throw new Error(`从 CDN 加载文档失败: ${subDoc.path}, 错误: ${error}`)
      }
    }

    throw new Error(`子文档 ${docId} 配置错误: 缺少 content 或 path`)
  }

  /**
   * 列出所有已注册的 Skills
   */
  listSkills(): WebSkill[] {
    return Array.from(this.skills.values())
  }

  /**
   * 根据分类筛选 Skills
   */
  getSkillsByCategory(category: string): WebSkill[] {
    return this.listSkills().filter((skill) => skill.metadata.category === category)
  }

  /**
   * 根据标签搜索 Skills
   */
  searchSkillsByTag(tag: string): WebSkill[] {
    return this.listSkills().filter((skill) => skill.metadata.tags?.includes(tag))
  }

  /**
   * 清除 CDN 缓存
   */
  clearCdnCache(): void {
    this.cdnCache.clear()
    console.log('[SkillsManager] CDN 缓存已清除')
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalSkills: this.skills.size,
      cdnCacheSize: this.cdnCache.size,
      categories: [...new Set(this.listSkills().map((s) => s.metadata.category))].filter(Boolean)
    }
  }
}

// 全局单例实例
let skillsManagerInstance: SkillsManager | null = null

/**
 * 使用 Skills Manager 的 Composable
 */
export function useSkillsManager(mcpServer?: WebMcpServer) {
  if (!skillsManagerInstance) {
    skillsManagerInstance = new SkillsManager(mcpServer)
  }

  const stats = ref({
    totalSkills: 0,
    cdnCacheSize: 0,
    categories: [] as string[]
  })

  // 更新统计信息
  const updateStats = () => {
    stats.value = skillsManagerInstance!.getStats()
  }

  return {
    manager: skillsManagerInstance,
    stats,
    updateStats
  }
}
