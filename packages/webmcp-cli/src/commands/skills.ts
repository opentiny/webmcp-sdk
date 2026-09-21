/**
 * skills 命令：查询与读取浏览器扩展中注册的 Skills 技能
 *
 * 用法：
 *   webmcp-cli --mode wxt skills list
 *   webmcp-cli --mode wxt skills get <skillName>
 */

import type { WxtBrowserAdapter } from '../adapters/wxt-adapter.js'

export async function handleSkillsCommand(adapter: WxtBrowserAdapter, args: string[]): Promise<void> {
  const subCommand = args[0]
  const restArgs = args.slice(1)
  const isJson = args.includes('--json')

  if (!subCommand || subCommand === '--help' || subCommand === '-h') {
    printSkillsHelp()
    return
  }

  if (subCommand === 'list') {
    await handleSkillsList(adapter, isJson)
    return
  }

  if (subCommand === 'get') {
    const skillName = restArgs.find((a) => !a.startsWith('-'))
    if (!skillName) {
      console.error('[错误] 请提供技能名称。示例：webmcp-cli --mode wxt skills get <skillName>')
      process.exit(1)
    }
    await handleSkillsGet(adapter, skillName, isJson)
    return
  }

  console.error(`[错误] 未知子命令: skills ${subCommand}`)
  printSkillsHelp()
  process.exit(1)
}

async function handleSkillsList(adapter: WxtBrowserAdapter, isJson: boolean): Promise<void> {
  try {
    const result = await adapter.listSkills()
    if (isJson) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      const skills = result as Array<{ name: string; description?: string; source?: string }>
      if (!skills || skills.length === 0) {
        console.log('（当前扩展未注册任何技能）')
        return
      }
      console.log(`\n📚 已注册 Skills（共 ${skills.length} 个）：\n`)
      for (const skill of skills) {
        console.log(`  • ${skill.name}`)
        if (skill.description) {
          console.log(`    ${skill.description.slice(0, 100)}${skill.description.length > 100 ? '...' : ''}`)
        }
      }
      console.log(`\n提示：使用 "webmcp-cli --mode wxt skills get <name>" 查看技能详情`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (isJson) {
      console.log(JSON.stringify({ error: msg }))
    } else {
      console.error(`❌ 获取技能列表失败：${msg}`)
    }
    process.exit(1)
  }
}

async function handleSkillsGet(adapter: WxtBrowserAdapter, name: string, isJson: boolean): Promise<void> {
  try {
    const result = await adapter.getSkill(name)
    if (isJson) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      const skill = result as { name: string; description?: string; instructions?: string }
      console.log(`\n📖 技能：${skill.name}`)
      if (skill.description) console.log(`描述：${skill.description}`)
      if (skill.instructions) {
        console.log('\n--- 指令 ---')
        console.log(skill.instructions)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (isJson) {
      console.log(JSON.stringify({ error: msg }))
    } else {
      console.error(`❌ 获取技能详情失败：${msg}`)
    }
    process.exit(1)
  }
}

function printSkillsHelp(): void {
  console.log(`
webmcp-cli --mode wxt skills - 查询与读取浏览器扩展中注册的 Skills 技能

用法：
  webmcp-cli --mode wxt skills list          列出所有已注册的技能
  webmcp-cli --mode wxt skills get <name>    读取指定技能的详细执行指令

选项：
  --json    输出 JSON 格式结果

示例：
  webmcp-cli --mode wxt skills list
  webmcp-cli --mode wxt skills get order-management
`.trim())
}
