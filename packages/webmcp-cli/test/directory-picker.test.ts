import { describe, it, expect } from 'vitest'
import { escapePowerShellString } from '../src/bridge/directory-picker.js'

describe('Windows 文件夹选择器 PowerShell 特殊字符转义', () => {
  it('复现：title 与 defaultPath 中包含双引号、反引号、$ 符号时应被安全转义，路径反斜杠保留', () => {
    // 1. 普通字符串不受影响
    expect(escapePowerShellString('请选择项目目录')).toBe('请选择项目目录')

    // 2. 双引号转义为 `"
    expect(escapePowerShellString('选择"工作区"目录')).toBe('选择`"工作区`"目录')

    // 3. 反引号转义为 ``
    expect(escapePowerShellString('目录名含`反引号`')).toBe('目录名含``反引号``')

    // 4. $ 变量符号转义为 `$ 防止变量展开
    expect(escapePowerShellString('C:\\Users\\$admin\\Projects')).toBe('C:\\Users\\`$admin\\Projects')

    // 5. 组合包含反引号、双引号与变量符号
    const complex = 'Title: `Project "$NAME"`'
    expect(escapePowerShellString(complex)).toBe('Title: ``Project `"`$NAME`"``')
  })
})
