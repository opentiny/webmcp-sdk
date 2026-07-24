import { INSPECT_ATTR } from './types'

let nextId = 1
const registry = new Map<string, Element>()

export function resetInspectRegistryForTests(): void {
  nextId = 1
  registry.clear()
}

/** 为元素分配或复用 elementId，并写入 data-webmcp-el-id */
export function registerElement(el: Element): string {
  const existing = el.getAttribute(INSPECT_ATTR)
  if (existing && registry.get(existing) === el) {
    return existing
  }
  const id = `webmcp-el-${nextId++}`
  el.setAttribute(INSPECT_ATTR, id)
  registry.set(id, el)
  return id
}

export function getRegisteredElement(elementId: string): Element | null {
  const el = registry.get(elementId)
  if (!el) return null
  if (!el.isConnected) {
    registry.delete(elementId)
    return null
  }
  return el
}

export function listRegisteredIds(): string[] {
  return Array.from(registry.keys())
}
