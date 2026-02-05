import type { SkillHandler } from '../types'

export const calculatorHandler: SkillHandler = async (args) => {
  const { a, b, operation } = args

  let result: number
  switch (operation) {
    case 'add':
      result = a + b
      break
    case 'subtract':
      result = a - b
      break
    case 'multiply':
      result = a * b
      break
    case 'divide':
      if (b === 0) throw new Error('不能除以零')
      result = a / b
      break
    default:
      throw new Error(`未知运算: ${operation}`)
  }

  return {
    result,
    formula: `${a} ${operation} ${b} = ${result}`
  }
}
