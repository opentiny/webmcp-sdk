/** 检视相关常量与类型 */

export const INSPECT_ATTR = 'data-webmcp-el-id'
export const INSPECT_UI_ATTR = 'data-webmcp-inspect-ui'
export const INSPECT_REF_PREFIX = 'webmcp-inspect:v1'
export const HTML_ELEMENT_MAX_CHARS = 2048

export interface InspectRef {
  version: 1
  tabId: string
  elementId: string
}

export interface ElementPosition {
  top: number
  left: number
  width: number
  height: number
}

export interface ElementMeta {
  domPath: string
  position: ElementPosition
  htmlElement: string
}
