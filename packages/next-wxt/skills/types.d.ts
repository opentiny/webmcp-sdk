/**
 * Skill 系统类型定义
 * 用于管理 AI 专家的系统提示词和 MCP 工具组合
 */

/**
 * Skill 元信息接口
 */
export interface SkillMeta {
  /** 唯一标识符 */
  name: string
  /** 显示名称（用于 @ 调用） */
  label: string
  /** 别名数组（支持多个 @ 名称） */
  aliases?: string[]
  /** 描述信息 */
  description?: string
  /** 图标 URL（可选） */
  icon?: string
  /** 分类（可选，用于分组） */
  category?: string
  /** 关联域名 */
  requiredDomains?: string
}

/**
 * Skill 接口
 * 包含元信息、提示词和工具列表
 */
export interface Skill {
  /** Skill 元信息 */
  meta: SkillMeta
  /** 系统提示词内容 */
  prompt: string
  /** 该 skill 需要的 MCP 工具名称列表（可选） */
  tools?: string[]
}

/**
 * Skill 导出格式
 * 每个 skill 目录下的 index.ts 应该导出此格式
 */
export interface SkillExport {
  meta: SkillMeta
  prompt: string
  tools?: string[]
}
