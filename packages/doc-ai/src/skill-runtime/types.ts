export interface SkillContext {
  vfs: {
    readFile(path: string): Promise<string>
  }
}

// Handler 函数签名
export type SkillHandler = (args: any, context: SkillContext) => Promise<any>

// Skill 配置（声明式）
export interface WebSkillConfig {
  name: string
  description?: string
  inputSchema: {
    type: 'object'
    properties?: Record<string, any>
    required?: string[]
    [key: string]: any
  }
  handler: string // handler 名称或路径
}

// 完整的 Skill（配置 + 执行函数）
export interface WebSkill {
  name: string
  description?: string
  inputSchema: {
    type: 'object'
    properties?: Record<string, any>
    required?: string[]
    [key: string]: any
  }
  execute: SkillHandler
}
