export { formatInspectRef, parseInspectRef } from './clipboard-ref'
export {
  buildDomPath,
  buildElementMeta,
  formatElementMetaText,
  getElementPosition,
  pathSegment,
  serializeHtmlElement,
  truncateHtml,
} from './metadata'
export {
  getRegisteredElement,
  listRegisteredIds,
  registerElement,
  resetInspectRegistryForTests,
} from './registry'
export { initElementInspect, getInspectModeController } from './inspect-mode'
export { registerInspectElementTool, INSPECT_ELEMENT_TOOL_NAME } from './register-tool'
export { CONTROL_FAB_ID, CONTROL_FAB_MINI_ID, ControlFab } from './control-fab'
export {
  HTML_ELEMENT_MAX_CHARS,
  INSPECT_ATTR,
  INSPECT_REF_PREFIX,
  INSPECT_UI_ATTR,
  type ElementMeta,
  type InspectRef,
} from './types'

import { initElementInspect } from './inspect-mode'
import { registerElement } from './registry'

/** 安装快捷键，并挂载 E2E/调试用的 selector 登记函数 */
export function initElementInspectWithDebug(): void {
  initElementInspect()
  ;(window as Window & {
    __webmcpcli_inspectRegister?: (selector: string) => string
  }).__webmcpcli_inspectRegister = (selector: string) => {
    const el = document.querySelector(selector)
    if (!el) throw new Error(`selector not found: ${selector}`)
    return registerElement(el)
  }
}
