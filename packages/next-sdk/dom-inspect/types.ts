/** DOM 检视相关常量与类型 */

export const DOM_INSPECT_UI_ATTR = 'data-opentiny-dom-inspect-ui'
export const HTML_ELEMENT_MAX_CHARS = 2048

/** 复制文本中输出的计算样式字段（对齐 Cursor 元素卡片） */
export const COMPUTED_STYLE_KEYS = [
  'color',
  'backgroundColor',
  'fontSize',
  'fontFamily',
  'display',
  'position',
] as const

export interface ElementPosition {
  top: number
  left: number
  width: number
  height: number
}

export interface ElementAttribute {
  name: string
  value: string
}

/** 点选元素的结构化元信息（对齐 Cursor 元素卡片分区） */
export interface ElementMeta {
  /** ELEMENT：开标签摘要，如 `<div class="…">` */
  element: string
  /** PATH */
  path: string
  /** ATTRIBUTES */
  attributes: ElementAttribute[]
  /** COMPUTED STYLES */
  computedStyles: Record<string, string>
  /** POSITION & SIZE */
  position: ElementPosition
  /** INNER TEXT */
  innerText: string
}

export interface InspectAssistOptions {
  /** FAB idle 文案，默认 'Inspect' */
  brandLabel?: string
  /** 是否显示 FAB，默认 true */
  showFab?: boolean
  /** 复制成功回调 */
  onCopied?: (text: string, meta: ElementMeta) => void
}

export interface InspectAssistHandle {
  disable: () => void
  isActive: () => boolean
  enter: () => void
  exit: () => void
  toggle: () => void
}
