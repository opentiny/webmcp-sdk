/**
 * a11y/ref-allocator.ts
 *
 * 将无障碍树的可交互引用编号（#ref）稳定绑定到具体 DOM 元素实例：
 * - 同一会话内，已分配过 #ref 的存活 DOM 元素始终复用原编号，避免插入/删除其它节点引起全局编号偏移；
 * - 元素移除后旧编号作废且不复用（计数器单调递增），确保旧编号不会静默指向其它新元素；
 * - 使用 WeakMap 持有 Element 引用，SPA 销毁节点后可被 GC 自动回收，不产生内存泄漏。
 */

export interface RefAllocator {
  /** 为目标 DOM 元素获取稳定 #ref：若已分配则复用，否则分配新递增编号 */
  allocate(el: Element): number
  /** 重置元素映射表与递增计数器（新建或清空会话、宿主调用 resetSession() 时调用） */
  reset(): void
}

export class ElementRefAllocator implements RefAllocator {
  private elementToRef = new WeakMap<Element, number>()
  private nextRef = 0

  allocate(el: Element): number {
    const existing = this.elementToRef.get(el)
    if (existing !== undefined) {
      return existing
    }
    const assigned = this.nextRef++
    this.elementToRef.set(el, assigned)
    return assigned
  }

  reset(): void {
    this.elementToRef = new WeakMap<Element, number>()
    this.nextRef = 0
  }
}
