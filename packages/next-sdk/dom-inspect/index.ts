import { InspectModeController } from './inspect-mode'
import type { InspectAssistHandle, InspectAssistOptions } from './types'

export type {
  InspectAssistOptions,
  InspectAssistHandle,
  ElementMeta,
  ElementPosition,
  ElementAttribute,
} from './types'
export {
  buildDomPath,
  buildElementMeta,
  formatElementMetaText,
  truncateHtml,
  getElementPosition,
  pathSegment,
  serializeHtmlElement,
  serializeOpeningTag,
  escapeIdent,
} from './metadata'
export { CONTROL_FAB_ID, CONTROL_FAB_MINI_ID, ControlFab } from './control-fab'
export { DOM_INSPECT_UI_ATTR, HTML_ELEMENT_MAX_CHARS, COMPUTED_STYLE_KEYS } from './types'

let singleton: InspectModeController | null = null

function getController(): InspectModeController {
  if (!singleton) singleton = new InspectModeController()
  return singleton
}

function createHandle(ctrl: InspectModeController): InspectAssistHandle {
  return {
    /** 仅拆除本 handle 绑定的 controller；若全局 singleton 已换新实例则不动 */
    disable: () => {
      ctrl.destroy()
      if (singleton === ctrl) singleton = null
    },
    isActive: () => ctrl.isActive(),
    enter: () => ctrl.enter(),
    exit: () => ctrl.exit(),
    toggle: () => ctrl.toggle(),
  }
}

/**
 * 启用 Inspect Assist：点选页面区域，复制 Cursor 元素卡片元数据，
 * 便于快速定位并修改对应样式 / 逻辑。
 */
export function enableInspectAssist(options?: InspectAssistOptions): InspectAssistHandle {
  const ctrl = getController()
  ctrl.install(options)
  return createHandle(ctrl)
}

/** 关闭并拆除 Inspect Assist */
export function disableInspectAssist(): void {
  if (!singleton) return
  singleton.destroy()
  singleton = null
}
