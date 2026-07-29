import {
  COMPUTED_STYLE_KEYS,
  DOM_INSPECT_UI_ATTR,
  HTML_ELEMENT_MAX_CHARS,
  type ElementAttribute,
  type ElementMeta,
  type ElementPosition,
} from './types'

const SKIP_ATTRS = new Set([DOM_INSPECT_UI_ATTR, 'data-cursor-element-id'])

/** 截断过长文本，中间省略 */
export function truncateHtml(html: string, maxChars = HTML_ELEMENT_MAX_CHARS): string {
  if (maxChars === Infinity) return html
  const limit = Number.isFinite(maxChars) ? Math.max(0, Math.floor(maxChars)) : 0
  if (html.length <= limit) return html
  if (limit <= 3) return '.'.repeat(limit)
  const head = Math.floor((limit - 3) * 0.6)
  const tail = limit - 3 - head
  return `${html.slice(0, head)}...${html.slice(-tail)}`
}

function isInspectUiNode(node: Element | null): boolean {
  return !!node?.closest(`[${DOM_INSPECT_UI_ATTR}]`)
}

/** CSS.escape 兜底，便于 Node 单测环境 */
export function escapeIdent(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  if (value === '') return ''
  // 对齐 CSS.escape：前导数字、连字符+数字，以及标点需转义
  let out = ''
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!
    const code = ch.charCodeAt(0)
    if (
      (i === 0 && code >= 0x30 && code <= 0x39) ||
      (i === 1 && value[0] === '-' && code >= 0x30 && code <= 0x39)
    ) {
      out += `\\${code.toString(16)} `
      continue
    }
    if (/[ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/.test(ch)) {
      out += `\\${ch}`
      continue
    }
    out += ch
  }
  return out
}

function classList(el: Element): string[] {
  if (typeof el.className !== 'string') return []
  return el.className
    .split(/\s+/)
    .filter(Boolean)
    .filter((c) => !c.startsWith('opentiny-dom-inspect') && !c.startsWith('dom-inspect-fab'))
}

/** 生成单个节点的 path 段（不含兄弟序号）：tag#id.class1 class2 */
export function pathSegment(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const id =
    el.id && !el.id.startsWith('opentiny-dom-inspect') ? `#${escapeIdent(el.id)}` : ''
  const classes = classList(el).map((c) => escapeIdent(c))
  // Cursor：仅第一个 class 前加 `.`，其余以空格分隔
  const classPart = classes.length > 0 ? `.${classes.join(' ')}` : ''
  return `${tag}${id}${classPart}`
}

/** 同签名兄弟中的 1-based 序号；唯一则返回 null */
function siblingOrdinal(el: Element): number | null {
  const parent = el.parentElement
  if (!parent) return null
  const sig = pathSegment(el)
  const matches = Array.from(parent.children).filter(
    (c): c is Element => c.nodeType === 1 && pathSegment(c as Element) === sig
  )
  if (matches.length <= 1) return null
  return matches.indexOf(el) + 1
}

function pathSegmentWithIndex(el: Element): string {
  const base = pathSegment(el)
  const ord = siblingOrdinal(el)
  return ord == null ? base : `${base}[${ord}]`
}

/**
 * 自元素向上拼 PATH（跳过 inspect UI；不含 html/body）。
 * 重复兄弟追加 [n]（1-based），对齐 Cursor。
 */
export function buildDomPath(el: Element): string {
  const parts: string[] = []
  let cur: Element | null = el
  while (cur && cur.nodeType === 1) {
    const tag = cur.tagName
    if (tag === 'HTML' || tag === 'BODY') break
    if (!isInspectUiNode(cur)) {
      parts.unshift(pathSegmentWithIndex(cur))
    }
    cur = cur.parentElement
  }
  return parts.join(' > ')
}

/** POSITION：保留小数（如 514.4375px） */
export function getElementPosition(el: Element): ElementPosition {
  const rect = el.getBoundingClientRect()
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

function formatPx(n: number): string {
  // 去掉浮点噪声，但保留有意义的小数
  const v = Math.round(n * 10000) / 10000
  return `${v}px`
}

/** ELEMENT：开标签摘要（tag + id/class），对齐 Cursor 卡片 */
export function serializeOpeningTag(el: Element): string {
  const tag = el.tagName.toLowerCase()
  let out = `<${tag}`
  if (el.id && !el.id.startsWith('opentiny-dom-inspect')) {
    out += ` id="${el.id}"`
  }
  const cls = classList(el).join(' ')
  if (cls) out += ` class="${cls}"`
  return `${out}>`
}

/** @deprecated 兼容旧名：现为开标签摘要 */
export function serializeHtmlElement(el: Element): string {
  return serializeOpeningTag(el)
}

export function listAttributes(el: Element): ElementAttribute[] {
  const attrs: ElementAttribute[] = []
  for (const attr of Array.from(el.attributes)) {
    if (SKIP_ATTRS.has(attr.name)) continue
    if (attr.name.startsWith('opentiny-dom-inspect')) continue
    attrs.push({ name: attr.name, value: attr.value })
  }
  return attrs
}

export function getComputedStyleMap(el: Element): Record<string, string> {
  const styles: Record<string, string> = {}
  if (typeof getComputedStyle !== 'function') {
    for (const key of COMPUTED_STYLE_KEYS) styles[key] = ''
    return styles
  }
  const cs = getComputedStyle(el)
  for (const key of COMPUTED_STYLE_KEYS) {
    styles[key] = cs[key as keyof CSSStyleDeclaration] as string
  }
  return styles
}

export function getInnerText(el: Element): string {
  const text =
    typeof (el as HTMLElement).innerText === 'string'
      ? (el as HTMLElement).innerText
      : el.textContent || ''
  return truncateHtml(text.replace(/\r\n/g, '\n').trim(), HTML_ELEMENT_MAX_CHARS)
}

export function buildElementMeta(el: Element): ElementMeta {
  return {
    element: serializeOpeningTag(el),
    path: buildDomPath(el),
    attributes: listAttributes(el),
    computedStyles: getComputedStyleMap(el),
    position: getElementPosition(el),
    innerText: getInnerText(el),
  }
}

function formatNameValueBlock(entries: Array<[string, string]>): string[] {
  return entries.map(([name, value]) => `${name}: ${value}`)
}

/**
 * 粘贴到外部 AI 对话框的元素卡片纯文本：
 * 摘要 + ELEMENT / PATH / ATTRIBUTES / COMPUTED STYLES / POSITION & SIZE / INNER TEXT
 * + 修改意见引导；键值对同一行以减少换行。
 */
export function formatElementMetaText(meta: ElementMeta): string {
  const { position: p } = meta
  const attrLines = formatNameValueBlock(meta.attributes.map((a) => [a.name, a.value]))
  const styleLines = formatNameValueBlock(
    COMPUTED_STYLE_KEYS.map((k) => [k, meta.computedStyles[k] ?? ''])
  )
  const posLines = formatNameValueBlock([
    ['top', formatPx(p.top)],
    ['left', formatPx(p.left)],
    ['width', formatPx(p.width)],
    ['height', formatPx(p.height)],
  ])

  return [
    `当前选中的元素是：${meta.element}`,
    '',
    'ELEMENT',
    meta.element,
    'PATH',
    meta.path,
    'ATTRIBUTES',
    ...attrLines,
    'COMPUTED STYLES',
    ...styleLines,
    'POSITION & SIZE',
    ...posLines,
    'INNER TEXT',
    meta.innerText,
    '',
    '请输入修改意见：',
  ].join('\n')
}
