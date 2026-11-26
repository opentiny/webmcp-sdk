import { beforeEach, describe, expect, it } from 'vitest'
import { buildA11yTree } from '../../../page-tools/a11y/build'

function setupRoot(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html.trim()
  document.body.appendChild(root)
  return root
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('browserState 快照不输出敏感输入框的值', () => {
  it.each([
    [
      '密码框',
      '<label for="f">登录密码</label><input id="f" type="password" value="hunter2-secret">',
      'hunter2-secret'
    ],
    [
      '卡号',
      '<label for="f">卡号</label><input id="f" autocomplete="cc-number" value="4111111111111111">',
      '4111111111111111'
    ],
    ['安全码', '<label for="f">CVV</label><input id="f" autocomplete="cc-csc" value="737">', '737'],
    ['有效期', '<label for="f">有效期</label><input id="f" autocomplete="cc-exp" value="12/30">', '12/30'],
    ['短信验证码', '<label for="f">验证码</label><input id="f" autocomplete="one-time-code" value="864213">', '864213'],
    ['新密码', '<label for="f">新密码</label><input id="f" autocomplete="new-password" value="N3w-pass">', 'N3w-pass']
  ])('%s：快照保留标签和「已填写」标记，不含原值', (_, html, secret) => {
    const root = setupRoot(html)
    const { yaml } = buildA11yTree(root)
    expect(yaml).not.toContain(secret)
    // token 内的引号在 YAML 里转义为 \"
    expect(yaml).toMatch(/textbox #\d+ .*value=\\"\[已脱敏\]\\".*"(登录密码|卡号|CVV|有效期|验证码|新密码)"/)
  })

  it('空的密码框不输出 value，填写后才出现占位，fill 后的 Diff 仍能看出已填写', () => {
    const root = setupRoot('<label for="f">登录密码</label><input id="f" type="password">')
    expect(buildA11yTree(root).yaml).not.toContain('value=')
    root.querySelector('input')!.value = 'hunter2-secret'
    expect(buildA11yTree(root).yaml).toContain('value=\\"[已脱敏]\\"')
  })

  it('普通输入框的值照常输出', () => {
    const root = setupRoot('<label for="f">姓名</label><input id="f" autocomplete="name" value="张三">')
    const { yaml } = buildA11yTree(root)
    expect(yaml).toContain('value=\\"张三\\"')
  })
})
