import {
  HTML_ELEMENT_MAX_CHARS,
  INSPECT_ATTR,
  INSPECT_UI_ATTR,
  type ElementMeta,
  type ElementPosition,
} from './types'

/** 截断 outerHTML，中间省略，保证总长不超过 maxChars */
export function truncateHtml(html: string, maxChars = HTML_ELEMENT_MAX_CHARS): string {
  if (html.length <= maxChars) return html
  const head = Math.floor((maxChars - 3) * 0.6)
  const tail = maxChars - 3 - head
  return `${html.slice(0, head)}...${html.slice(-tail)}`
}

function isInspectUiNode(node: Element | null): boolean {
  return !!node?.closest(`[${INSPECT_UI_ATTR}]`)
}

/** CSS.escape 兜底，便于 Node 单测环境 */
export function escapeIdent(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return value.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1')
}

/** 生成单个节点的 path 段：tag#id.class1.class2（忽略 inspect 自身属性） */
export function pathSegment(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id && !el.id.startsWith('webmcp') ? `#${escapeIdent(el.id)}` : ''
  const className =
    typeof el.className === 'string'
      ? el.className
          .split(/\s+/)
          .filter(Boolean)
          .filter((c) => !c.startsWith('webmcp'))
          .map((c) => `.${escapeIdent(c)}`)
          .join('')
      : ''
  return `${tag}${id}${className}`
}

/**
 * 自元素向上拼 DOM Path（跳过 inspect UI 与 html/body 之上的无意义层仍保留 html/body）。
 * 格式：div#app > div.foo > span.bar
 */
export function buildDomPath(el: Element): string {
  const parts: string[] = []
  let cur: Element | null = el
  while (cur && cur.nodeType === 1) {
    if (!isInspectUiNode(cur)) {
      parts.unshift(pathSegment(cur))
    }
    if (cur.tagName === 'HTML') break
    cur = cur.parentElement
  }
  return parts.join(' > ')
}

export function getElementPosition(el: Element): ElementPosition {
  const rect = el.getBoundingClientRect()
  return {
    top: Math.round(rect.top),
    left: Math.round(rect.left),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

/** 清理 outerHTML 中的 inspect 属性后再截断 */
export function serializeHtmlElement(el: Element): string {
  const clone = el.cloneNode(true) as Element
  clone.removeAttribute(INSPECT_ATTR)
  clone.querySelectorAll(`[${INSPECT_ATTR}]`).forEach((n) => n.removeAttribute(INSPECT_ATTR))
  clone.querySelectorAll(`[${INSPECT_UI_ATTR}]`).forEach((n) => n.remove())
  return truncateHtml(clone.outerHTML)
}

export function buildElementMeta(el: Element): ElementMeta {
  return {
    domPath: buildDomPath(el),
    position: getElementPosition(el),
    htmlElement: serializeHtmlElement(el),
  }
}

/** Cursor 同款纯文本 */
export function formatElementMetaText(meta: ElementMeta): string {
  const { position: p, domPath, htmlElement } = meta
  return [
    `DOM Path: ${domPath}`,
    `Position: top=${p.top}px, left=${p.left}px, width=${p.width}px, height=${p.height}px`,
    `HTML Element: ${htmlElement}`,
  ].join('\n')
}
