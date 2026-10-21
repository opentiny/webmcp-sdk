import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const template = readFileSync(join(root, 'src/templates/WebMcpChat.vue'), 'utf8')
const app = readFileSync(join(root, 'src/App.vue'), 'utf8')

test('对话框使用 Chat 套件，并把页面 WebMCP 交给套件', () => {
  assert.match(template, /TrChat/)
  assert.match(template, /useChatRuntime/)
  assert.match(template, /document\.modelContext/)
  assert.match(template, /skillPlugin/)
  assert.doesNotMatch(template, /<template #/)
  assert.doesNotMatch(app, /next-remoter|TinyRemoter/)
})
