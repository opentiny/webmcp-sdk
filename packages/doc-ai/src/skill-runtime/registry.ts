import type { WebSkill, WebSkillConfig, SkillContext } from './types'
import { WebVirtualFileSystem } from './vfs'
import type { WebMcpClient } from '@opentiny/next-sdk'

export class SkillRegistry {
  private skills: Map<string, WebSkill> = new Map()
  private vfs: WebVirtualFileSystem
  private handlers: Map<string, (args: any, context: SkillContext) => Promise<any>> = new Map()

  constructor(mcpClient?: WebMcpClient) {
    this.vfs = new WebVirtualFileSystem(mcpClient)
  }

  /**
   * 注册 Handler
   */
  registerHandler(name: string, handler: (args: any, context: SkillContext) => Promise<any>) {
    this.handlers.set(name, handler)
  }

  /**
   * 从配置注册 Skill
   * 这是新的推荐方式：分离配置和实现
   */
  registerFromConfig(config: WebSkillConfig) {
    const handler = this.handlers.get(config.handler)
    if (!handler) {
      console.error(`Handler "${config.handler}" not found for skill "${config.name}"`)
      return
    }

    const skill: WebSkill = {
      name: config.name,
      description: config.description,
      inputSchema: config.inputSchema,
      execute: handler
    }

    this.register(skill)
  }

  /**
   * 直接注册完整的 Skill
   * 兼容旧方式
   */
  register(skill: WebSkill) {
    if (this.skills.has(skill.name)) {
      console.warn(`Skill "${skill.name}" is already registered. Overwriting.`)
    }
    this.skills.set(skill.name, skill)
  }

  getSkill(name: string): WebSkill | undefined {
    return this.skills.get(name)
  }

  getAllSkills(): WebSkill[] {
    return Array.from(this.skills.values())
  }

  async executeSkill(name: string, args: any): Promise<any> {
    const skill = this.skills.get(name)
    if (!skill) {
      throw new Error(`Skill "${name}" not found`)
    }

    const context: SkillContext = {
      vfs: this.vfs
    }

    try {
      return await skill.execute(args, context)
    } catch (error) {
      console.error(`Error executing skill "${name}":`, error)
      throw error
    }
  }
}
