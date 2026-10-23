import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { loadSkill } from '@opentiny/tiny-robot-kit'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const template = readFileSync(join(root, 'src/templates/WebMcpChat.vue'), 'utf8')
const app = readFileSync(join(root, 'src/App.vue'), 'utf8')
const priceProtection = readFileSync(join(root, 'src/views/price-protection/index.vue'), 'utf8')

test('对话框使用 Chat 套件，并把页面 WebMCP 交给套件', () => {
  assert.match(template, /TrChat/)
  assert.match(template, /useChatRuntime/)
  assert.match(template, /createWebMcpToolAdapter/)
  assert.match(template, /skillPlugin/)
  assert.match(template, /loadSkill/)
  assert.match(template, /id: 'skills'/)
  assert.match(template, /label: 'Skills'/)
  assert.doesNotMatch(template, /parseSkillFrontMatter|get_skill_content/)
  assert.doesNotMatch(template, /<template #/)
  assert.doesNotMatch(app, /next-remoter|TinyRemoter/)
})

test('价保创建工具不再要求 get_skill_content', () => {
  assert.doesNotMatch(priceProtection, /get_skill_content|isSkillRead/)
  assert.match(priceProtection, /select_skills/)
  assert.match(priceProtection, /客户价保单创建及审核/)
})

test('内置 SKILL.md 能被 kit loadSkill 解析', async () => {
  const skillsRoot = join(root, 'src/skills')
  const names = []
  for (const dir of readdirSync(skillsRoot)) {
    const raw = readFileSync(join(skillsRoot, dir, 'SKILL.md'), 'utf8')
    const file = new File([raw], 'SKILL.md', { type: 'text/markdown' })
    const skill = await loadSkill({ source: 'browser', fileList: [file] })
    assert.ok(skill.name)
    assert.ok(skill.description)
    assert.ok(skill.instructions)
    names.push(skill.name)
  }
  assert.ok(names.includes('客户价保单创建及审核'))
})
