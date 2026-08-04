/**
 * 步骤参数解析：ParamRef → args 取值
 */

import { isParamRef, type ParamRef } from './types'

export type StepArgs = Record<string, unknown>

/**
 * 解析 string | ParamRef；缺失参数时抛错
 */
export function resolveStepValue(value: string | ParamRef, args: StepArgs): string {
  if (isParamRef(value)) {
    const key = value.$param
    if (!(key in args) || args[key] == null) {
      throw new Error(`缺少工具参数: ${key}`)
    }
    return String(args[key])
  }
  return value
}

/**
 * 校验 steps 中引用的 $param 是否都在 inputSchema.properties 中声明（尽力而为）
 */
export function collectParamRefs(steps: unknown[]): string[] {
  const keys = new Set<string>()
  const walk = (node: unknown) => {
    if (isParamRef(node)) {
      keys.add(node.$param)
      return
    }
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (node && typeof node === 'object') {
      Object.values(node as Record<string, unknown>).forEach(walk)
    }
  }
  steps.forEach(walk)
  return [...keys]
}
