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
export async function parseSkillFrontMatter(
  content: string | (() => Promise<string>)
): Promise<{ name: string; description: string } | null> {
  if (typeof content !== 'string' && typeof content !== 'function') return null

  // 先提取 --- 之间的文本块
  const realContent = typeof content === 'string' ? content : await content()
  const blockMatch = realContent.match(FRONT_MATTER_BLOCK_REG)

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
async function normalizeSkillModuleKeys(
  modules: Record<string, string | (() => Promise<string>)>
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const [key, content] of Object.entries(modules)) {
    const normalizedKey = key.replace(/\\/g, '/')
    const skillsIndex = normalizedKey.lastIndexOf('skills/')
    const relativePath = skillsIndex >= 0 ? normalizedKey.slice(skillsIndex + 7) : normalizedKey
    const standardPath = relativePath.startsWith('./') ? relativePath : `./${relativePath}`
    const realContent = typeof content === 'string' ? content : await content()
    result[standardPath] = realContent
  }
  return result
}

/**
 * 获取所有「主 SKILL.md」的路径（一级子目录下的 SKILL.md）
 * - 对传入的 modules 先做 normalize，兼容任意 import.meta.glob 写法
 */
export async function getMainSkillPaths(modules: Record<string, string | (() => Promise<string>)>): Promise<string[]> {
  const normalized = await normalizeSkillModuleKeys(modules)
  return Object.keys(normalized).filter((path) => MAIN_SKILL_PATH_REG.test(path))
}

/**
 * 获取所有技能的概况列表（name、description、path），用于 systemPrompt 或列表展示
 * - 内部统一对 modules 做 normalize，避免调用方关心路径细节
 */
export async function getSkillOverviews(
  modules: Record<string, string | (() => Promise<string>)>
): Promise<SkillMeta[]> {
  const normalized = await normalizeSkillModuleKeys(modules)
  const mainPaths = Object.keys(normalized).filter((path) => MAIN_SKILL_PATH_REG.test(path))
  const list: SkillMeta[] = []
  for (const path of mainPaths) {
    const content = normalized[path]
    if (!content) continue
    const parsed = await parseSkillFrontMatter(content)
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
 * 根据相对路径获取某个技能文档的原始内容（支持 .md、.json、.xml 等文本格式）
 * - 自动对 modules 做 normalize，再按 path 查找
 */
export async function getSkillMdContent(
  modules: Record<string, string | (() => Promise<string>)>,
  path: string
): Promise<string | undefined> {
  const normalized = await normalizeSkillModuleKeys(modules)

  // 1. 尝试原有的严格匹配
  const exactMatch = normalized[path]
  if (exactMatch) return exactMatch

  // 2. 降级匹配：如果严格匹配完整路径未找到
  // 则尝试寻找后缀能够匹配上的真实文件路径。
  // 去除开头的 '.' 或 './' 以精确匹配结尾部分的路径。
  const suffix = path.replace(/^\.?\//, '/')
  const matchingKey = Object.keys(normalized).find((key) => key.endsWith(suffix))
  return matchingKey ? normalized[matchingKey] : undefined
}

/**
 * 根据技能 name 查找其主 SKILL.md 的路径
 * 支持匹配目录名（如 ecommerce）或 SKILL.md 内 frontmatter 定义的 name
 * - 依赖 getMainSkillPaths，内部已做 normalize
 */
export async function getMainSkillPathByName(
  modules: Record<string, string | (() => Promise<string>)>,
  name: string
): Promise<string | undefined> {
  const normalizedModules = await normalizeSkillModuleKeys(modules)
  const paths = await getMainSkillPaths(normalizedModules)

  // 1. 先尝试按目录名精确匹配 (兼容老逻辑)
  const dirMatch = paths.find((p) => p.startsWith(`./${name}/SKILL.md`))
  if (dirMatch) return dirMatch

  // 2. 如果按目录名找不到，则解析内容按 frontmatter 的 name 匹配
  for (const p of paths) {
    const content = normalizedModules[p]
    if (content) {
      const parsed = await parseSkillFrontMatter(content)
      if (parsed && parsed.name === name) {
        return p
      }
    }
  }

  return undefined
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SkillToolsSet = Record<string, any>

// 提升为模块级常量：避免 tool() 推断 PARAMETERS 泛型时递归展开 Zod 链导致"类型实例化过深"
const SKILL_INPUT_SCHEMA = z.object({
  skillName: z
    .string()
    .optional()
    .describe(
      '进入某个技能的主入口名称。优先匹配技能的目录名（如 ecommerce），或者技能的中文名称（如"客户价保单创建及审核"）。'
    ),
  path: z
    .string()
    .optional()
    .describe('你想查阅的文档的路径。如 ./calculator/SKILL.md 或从其他文档里看到的相对路径 ./reference/inventory.md。'),
  currentPath: z
    .string()
    .optional()
    .describe(
      '你当前正在阅读的文档路径（如果有）。比如你刚刚读取了 ./ecommerce/SKILL.md，请把这个路径原样传回来，这样系统才能根据你的相对路径准确找到下一份文件。'
    )
})

/**
 * 根据 skillMdModules 创建供 AI 调用的工具集,返回 `getSkillContent` 函数
 */
export function createSkillTools(modules: Record<string, string | (() => Promise<string>)>): SkillToolsSet {
  let isNormalizeSkillModuleKeys = false
  let normalizeSkillModuleKeysResult: Record<string, string>

  // @ts-ignore ai package 的 tool() 函数类型推断存在"类型实例化过深"的已知限制，无法正确推断包含复杂 Zod 链的 schema
  const getSkillContent = tool({
    description:
      '根据技能名称或文档路径获取该技能的完整文档内容。如果你想根据相对路径查阅文件，请务必同时提供你当前所在的文件路径 currentPath。',
    inputSchema: SKILL_INPUT_SCHEMA,
    execute: async (args: {
      skillName?: string
      path?: string
      currentPath?: string
    }): Promise<Record<string, unknown>> => {
      if (!isNormalizeSkillModuleKeys) {
        normalizeSkillModuleKeysResult = await normalizeSkillModuleKeys(modules)
        isNormalizeSkillModuleKeys = true
      }

      const normalizedModules = normalizeSkillModuleKeysResult
      const { skillName, path: pathArg, currentPath: currentPathArg } = args
      let content: string | undefined
      let resolvedPath = ''

      if (pathArg) {
        // 使用明确提供的当前阅读上下文作为基准路径（默认在根目录）
        let basePathContext = '.'
        if (currentPathArg) {
          // 提取出当前文档所在的目录
          // 比如 ./ecommerce/SKILL.md -> ./ecommerce
          const lastSlashIndex = currentPathArg.lastIndexOf('/')
          if (lastSlashIndex >= 0) {
            basePathContext = currentPathArg.slice(0, lastSlashIndex)
          }
        }

        // 尝试 1：按照大模型当前提供的上下文进行标准相对路径解析
        const dummyBase = `http://localhost/${basePathContext}/`
        const url = new URL(pathArg, dummyBase)
        resolvedPath = '.' + url.pathname
        content = await getSkillMdContent(normalizedModules, resolvedPath)

        // 尝试 2：如果大模型忘了传正确的 currentPath，或者是强行传错，做个智能根目录回退
        if (content === undefined && (pathArg.startsWith('./') || pathArg.startsWith('../')) && currentPathArg) {
          const baseParts = currentPathArg.split('/')
          if (baseParts.length >= 2) {
            const skillRoot = baseParts[1]
            const fallbackDummyBase = `http://localhost/${skillRoot}/`
            const fallbackUrl = new URL(pathArg, fallbackDummyBase)
            const fallbackPath = '.' + fallbackUrl.pathname
            content = await getSkillMdContent(normalizedModules, fallbackPath)
            if (content) {
              resolvedPath = fallbackPath
            }
          }
        }

        // 尝试 3：后缀自动降级匹配修正
        if (content && !normalizedModules[resolvedPath]) {
          const suffix = resolvedPath.replace(/^\.?\//, '/')
          const matchingKey = Object.keys(normalizedModules).find((key) => key.endsWith(suffix))
          if (matchingKey) {
            resolvedPath = matchingKey
          }
        }
      } else if (skillName) {
        const mainPath = await getMainSkillPathByName(normalizedModules, skillName)
        if (mainPath) {
          resolvedPath = mainPath
          content = await getSkillMdContent(normalizedModules, mainPath)
        }
      }

      if (content === undefined) {
        return {
          error: '未找到对应技能文档',
          skillName,
          path: pathArg,
          providedCurrentPath: currentPathArg,
          attemptedPath: resolvedPath
        }
      }

      return { content, path: resolvedPath }
    }
  })

  return getSkillContent
}
