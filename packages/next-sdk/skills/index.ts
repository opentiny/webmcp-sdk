/**
 * Web 端 Skill 公共能力模块（next-sdk）
 * - 提供解析、概况、systemPrompt 拼接、按路径/名称查文档
 * - 提供 createSkillTools：供 remoter 注入为 AI 工具，大模型可自动识别并加载技能文档
 */

import { tool } from 'ai'
import { z } from 'zod'
import matter from 'gray-matter-browser'

/** 主 SKILL.md 路径格式：仅匹配一级子目录下的 SKILL.md，如 ./calculator/SKILL.md */
const MAIN_SKILL_PATH_REG = /^\.\/[^/]+\/SKILL\.md$/

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
  if (!content) return null

  const { data } = matter(content)
  return data || null
}

/**
 * 获取所有「主 SKILL.md」的路径（一级子目录下的 SKILL.md）
 */
export function getMainSkillPaths(modules: Record<string, string>): string[] {
  return Object.keys(modules).filter((path) => MAIN_SKILL_PATH_REG.test(path))
}

/**
 * 获取所有技能的概况列表（name、description、path），用于 systemPrompt 或列表展示
 */
export function getSkillOverviews(modules: Record<string, string>): SkillMeta[] {
  const mainPaths = getMainSkillPaths(modules)
  const list: SkillMeta[] = []
  for (const path of mainPaths) {
    const parsed = parseSkillFrontMatter(modules[path])
    if (!parsed) continue

    list.push({
      ...parsed,
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
 * 获取所有已加载的 md 文件路径（含主 SKILL.md 与 reference 等）
 */
export function getSkillMdPaths(modules: Record<string, string>): string[] {
  return Object.keys(modules)
}

/**
 * 根据相对路径获取某个 md 文档的原始内容
 */
export function getSkillMdContent(modules: Record<string, string>, path: string): string | undefined {
  return modules[path]
}

/**
 * 根据技能 name 查找其主 SKILL.md 的路径（name 与目录名一致）
 */
export function getMainSkillPathByName(modules: Record<string, string>, name: string): string | undefined {
  return getMainSkillPaths(modules).find((p) => p.startsWith(`./${name}/SKILL.md`))
}

// ============ 内置工具：供 remoter 注入，替代业界 skill 中「读取文档」的操作 ============

/** AI SDK Tool 类型，用于 extraTools 合并，不写死泛型避免与 ai 包版本强绑定 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SkillToolsSet = Record<string, any>

/**
 * 根据 skillMdModules 创建供 AI 调用的工具集
 * - list_skills: 列出所有技能概况（name、description）
 * - get_skill_content: 按技能名或路径获取完整文档内容，便于大模型自动识别并加载技能
 * remoter 可将返回的 tools 合并进 extraTools 注入 agent
 */
export function createSkillTools(modules: Record<string, string>): SkillToolsSet {
  const getSkillContent = tool({
    description:
      '根据技能名称或文档路径获取该技能的完整 Markdown 文档内容。传入 skillName（如 calculator）或 path（如 ./calculator/SKILL.md）',
    inputSchema: z.object({
      skillName: z.string().optional().describe('技能名称，与目录名一致，如 calculator'),
      path: z.string().optional().describe('文档相对路径，如 ./calculator/SKILL.md 或 ./product-guide/reference/xxx.md')
    }),
    execute: ({ skillName, path: pathArg }) => {
      let content: string | undefined
      if (pathArg) {
        content = getSkillMdContent(modules, pathArg)
      } else if (skillName) {
        const mainPath = getMainSkillPathByName(modules, skillName)
        content = mainPath ? getSkillMdContent(modules, mainPath) : undefined
      }
      if (content === undefined) {
        return { error: '未找到对应技能文档', skillName: skillName ?? pathArg }
      }
      return { content, path: pathArg ?? getMainSkillPathByName(modules, skillName!) }
    }
  })

  return {
    get_skill_content: getSkillContent
  }
}
