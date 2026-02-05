import type { WebMcpClient } from '@opentiny/next-sdk'
import { SkillRegistry } from './registry'
import * as calculatorHandlers from './handlers/calculator'
import * as readDocHandlers from './handlers/read-doc'
import * as productGuideHandlers from './handlers/product-guide'

// 导入所有 skill.json
import calculatorSkill from '../skills/calculator/skill.json'
import readDocSkill from '../skills/read-doc/skill.json'
import productGuideSkills from '../skills/product-guide/skill.json'

/**
 * 自动加载器
 * 扫描 skills 文件夹并注册所有技能
 */
export async function loadAllSkills(mcpClient?: WebMcpClient): Promise<SkillRegistry> {
  const registry = new SkillRegistry(mcpClient)

  // Handler 映射表
  const handlerMap: Record<string, any> = {
    calculatorHandler: calculatorHandlers.calculatorHandler,
    readDocHandler: readDocHandlers.readDocHandler,
    searchGuideHandler: productGuideHandlers.searchGuideHandler,
    getSectionHandler: productGuideHandlers.getSectionHandler
  }

  // 注册所有 handlers
  Object.entries(handlerMap).forEach(([name, handler]) => {
    registry.registerHandler(name, handler)
  })

  // 注册单个技能
  registry.registerFromConfig(calculatorSkill as any)
  registry.registerFromConfig(readDocSkill as any)

  // 注册多技能包（product-guide）
  if ('skills' in productGuideSkills && Array.isArray(productGuideSkills.skills)) {
    productGuideSkills.skills.forEach((skill: any) => {
      registry.registerFromConfig(skill)
    })
  }

  console.log(`✓ Loaded ${registry.getAllSkills().length} skills`)

  return registry
}
