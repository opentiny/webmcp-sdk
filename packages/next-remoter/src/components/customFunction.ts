import { transform } from '@babel/standalone'
import { Interpreter, Function } from 'eval5'
Interpreter.global = window

export class CustomFunction {
  constructor(...argv: any[]) {
    // console.log('---------argv------------', argv)
    if (argv.length > 0) {
      const lastArg = argv[argv.length - 1]
      // 将代码包装在函数中以避免顶层 return 语句报错
      const wrappedCode = `(function() { ${lastArg} })()`
      const res = transform(wrappedCode, {
        presets: [['env', { modules: false }]],
        sourceType: 'script' // 使用 script 模式，避免严格模式导致 with 语句报错
      })
      // 提取转换后的代码，移除包装函数
      const transformedCode = res.code
        .replace(/^\(function\s*\(\)\s*\{/, '') // 移除开头的包装
        .replace(/\}\)\(\);?$/, '') // 移除结尾的包装
        .trim()
      argv[argv.length - 1] = transformedCode
    }

    const Fn = Function as any

    return new Fn(...argv)
  }
}
