/**
 * Web 端 Skill 公共能力模块（next-sdk）
 * - 提供解析、概况、systemPrompt 拼接、按路径/名称查文档
 * - 提供 createSkillTools：供 remoter 注入 get_skill_content 工具，大模型可按需加载技能文档
 */

import { tool } from 'ai'
import { z } from 'zod'

/** 主 SKILL.md 路径格式：仅匹配一级子目录下的 SKILL.md，如 ./calculator/SKILL.md */
const MAIN_SKILL_PATH_REG = /^\.\/[^/]+\/SKILL\.md$/

/** 从 front matter 中提取 name 和 description 的正则（--- 与 --- 之间） */
const FRONT_MATTER_BLOCK_REG = /^---\s*\n([\s\S]+?)\s*\n---/

/** 单个技能的概况信息（从主 SKILL.md 的 front matter 提取） */
export interface SkillMeta {
  /** 技能名称，与 skill 目录名一致 */
  name: string
  /** 技能描述，用于 systemPrompt */
  description: string
  /** 主 SKILL.md 相对路径，如 ./calculator/SKILL.md */
  path: string
}

/**
 * 从主 SKILL.md 的 YAML front matter 中用正则提取 name、description
 */
export function parseSkillFrontMatter(content: string): { name: string; description: string } | null {
  // 先提取 --- 之间的文本块
  const blockMatch = content.match(FRONT_MATTER_BLOCK_REG)
  if (!blockMatch?.[1]) return null
  const block = blockMatch[1]

  // 分别匹配 name 和 description 字段（支持任意顺序）
  const nameMatch = block.match(/^name:\s*(.+)$/m)
  const descMatch = block.match(/^description:\s*(.+)$/m)

  const name = nameMatch?.[1]?.trim()
  const description = descMatch?.[1]?.trim()

  return name && description ? { name, description } : null
}

/**
 * 将 Vite import.meta.glob 得到的多种 key 格式统一为「相对 skills 根目录」的路径（如 ./calculator/SKILL.md），
 * 以便 getSkillMdContent / getMainSkillPathByName 等能正确按 path 查找。
 * 兼容任意引入位置：./skills/xxx、../skills/xxx、src/skills/xxx 等，取最后一个 skills/ 后的部分并加上 ./
 */
function normalizeSkillModuleKeys(modules: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, content] of Object.entries(modules)) {
    const normalizedKey = key.replace(/\\/g, '/')
    const skillsIndex = normalizedKey.lastIndexOf('skills/')
    const relativePath = skillsIndex >= 0 ? normalizedKey.slice(skillsIndex + 7) : normalizedKey
    const standardPath = relativePath.startsWith('./') ? relativePath : `./${relativePath}`
    result[standardPath] = content
  }
  return result
}

/**
 * 获取所有「主 SKILL.md」的路径（一级子目录下的 SKILL.md）
 * - 对传入的 modules 先做 normalize，兼容任意 import.meta.glob 写法
 */
export function getMainSkillPaths(modules: Record<string, string>): string[] {
  const normalized = normalizeSkillModuleKeys(modules)
  return Object.keys(normalized).filter((path) => MAIN_SKILL_PATH_REG.test(path))
}

/**
 * 获取所有技能的概况列表（name、description、path），用于 systemPrompt 或列表展示
 * - 内部统一对 modules 做 normalize，避免调用方关心路径细节
 */
export function getSkillOverviews(modules: Record<string, string>): SkillMeta[] {
  const normalized = normalizeSkillModuleKeys(modules)
  const mainPaths = Object.keys(normalized).filter((path) => MAIN_SKILL_PATH_REG.test(path))
  const list: SkillMeta[] = []
  for (const path of mainPaths) {
    const content = normalized[path]
    if (!content) continue
    const parsed = parseSkillFrontMatter(content)
    if (!parsed) continue
    list.push({
      name: parsed.name,
      description: parsed.description,
      path
    })
  }
  return list
}

/**
 * 格式化为大模型 systemPrompt 可用的技能说明文本
 * @param skills 不传则需由调用方传入从 getSkillOverviews 得到的结果
 */
export function formatSkillsForSystemPrompt(skills: SkillMeta[]): string {
  if (skills.length === 0) return ''
  const lines = skills.map((s) => `- **${s.name}**: ${s.description}`)
  return `## 可用技能\n\n${lines.join('\n')}\n\n当需要用到某技能时，请使用 get_skill_content 工具获取该技能的完整文档内容。`
}

/**
 * 获取所有已加载的技能文件路径（含主 SKILL.md 与 reference 下的 .md/.json/.xml 等）
 * - 对 modules 做 normalize 后再返回 key 列表
 */
export function getSkillMdPaths(modules: Record<string, string>): string[] {
  const normalized = normalizeSkillModuleKeys(modules)
  return Object.keys(normalized)
}

/**
 * 根据相对路径获取某个技能文档的原始内容（支持 .md、.json、.xml 等文本格式）
 * - 自动对 modules 做 normalize，再按 path 查找
 */
export function getSkillMdContent(modules: Record<string, string>, path: string): string | undefined {
  const normalized = normalizeSkillModuleKeys(modules)
  return normalized[path]
}

/**
 * 根据技能 name 查找其主 SKILL.md 的路径（name 与目录名一致）
 * - 依赖 getMainSkillPaths，内部已做 normalize
 */
export function getMainSkillPathByName(modules: Record<string, string>, name: string): string | undefined {
  return getMainSkillPaths(modules).find((p) => p.startsWith(`./${name}/SKILL.md`))
}

// ============ 内置工具：供 remoter 注入，替代业界 skill 中「读取文档」的操作 ============

/** AI SDK Tool 类型，用于 extraTools 合并，不写死泛型避免与 ai 包版本强绑定 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SkillToolsSet = Record<string, any>

// 提升为模块级常量：避免 tool() 推断 PARAMETERS 泛型时递归展开 Zod 链导致"类型实例化过深"
const SKILL_INPUT_SCHEMA = z.object({
  skillName: z.string().optional().describe('技能名称，与目录名一致，如 calculator'),
  path: z.string().optional().describe('文档相对路径，如 ./calculator/SKILL.md 或 ./product-guide/reference/xxx.json')
})

/**
 * 根据 skillMdModules 创建供 AI 调用的工具集
 * - get_skill_content: 按技能名或路径获取完整文档内容，便于大模型自动识别并加载技能
 * remoter 可将返回的 tools 合并进 extraTools 注入 agent
 */
export function createSkillTools(modules: Record<string, string>): SkillToolsSet {
  const normalizedModules = normalizeSkillModuleKeys(modules)
  const getSkillContent = tool({
    description:
      '根据技能名称或文档路径获取该技能的完整文档内容。传入 skillName（如 calculator）或 path（如 ./calculator/SKILL.md）。支持 .md、.json、.xml 等各类文本格式文件。',
    inputSchema: SKILL_INPUT_SCHEMA,
    execute: (args: { skillName?: string; path?: string }): Record<string, unknown> => {
      const { skillName, path: pathArg } = args
      let content: string | undefined
      if (pathArg) {
        content = getSkillMdContent(normalizedModules, pathArg)
      } else if (skillName) {
        const mainPath = getMainSkillPathByName(normalizedModules, skillName)
        content = mainPath ? getSkillMdContent(normalizedModules, mainPath) : undefined
      }
      if (content === undefined) {
        return { error: '未找到对应技能文档', skillName: skillName ?? pathArg }
      }
      return { content, path: pathArg ?? getMainSkillPathByName(normalizedModules, skillName!) }
    }
  })

  return {
    get_skill_content: getSkillContent
  }
}
