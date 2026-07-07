/** 校验错误默认选择器：ARIA 标准 + 主流 UI 框架 */
export const DEFAULT_ERROR_SELECTORS: string[] = [
  // W3C ARIA 标准（最可靠，框架无关）
  '[role="alert"]',
  '[aria-invalid="true"]',
  // Tiny3 / Lego（华为云）
  '.ti3-unifyvalid-error', '.ti3-error', '.ti-error',
  '.lego-text-error', '.lego-error',
  // Element UI / Element Plus
  '.el-form-item__error',
  // Ant Design
  '.ant-form-item-explain-error',
  // Bootstrap
  '.is-invalid', '.invalid-feedback',
  // Angular
  '.ng-invalid',
  // 通用命名约定
  '.error-msg', '.error-message', '.error-text',
  '.field-error', '.form-error',
  '.is-error', '.has-error',
  '.validate-error', '.valid-error',
]

/** 模态弹窗默认选择器：ARIA 标准 + 主流 UI 框架 */
export const DEFAULT_DIALOG_SELECTORS: string[] = [
  // W3C ARIA 标准
  '[role="dialog"]',
  '[role="alertdialog"]',
  // Tiny3 / Lego（华为云）
  '[class*="ti3-modal"]', '[class*="ti3-message-box"]',
  // Element UI / Element Plus
  '[class*="el-dialog"]', '[class*="el-message-box"]',
  // Ant Design
  '[class*="ant-modal"]',
  // Bootstrap
  '[class*="modal-content"]',
  // Vuetify
  '[class*="v-dialog"]',
  // Naive UI
  '[class*="n-modal"]',
]

export interface PageAgentToolOptions {
  /** 允许在无障碍树节点中额外暴露的 DOM 属性白名单 */
  exposedAttributes?: string[]
}

declare global {
  interface Window {
    __webmcpcli_interactiveWhitelist?: Element[]
    __webmcpcli_interactiveBlacklist?: Element[]
    __webmcpcli_exposedAttributes?: string[]
    __webmcpcli_beforeGetBrowserState?: (() => void) | null
    /** 校验错误元素 CSS 选择器列表（覆盖默认，用于检测页面可见的校验错误） */
    __webmcpcli_errorSelectors?: string[]
    /** 模态弹窗元素 CSS 选择器列表（覆盖默认，用于检测阻塞交互的弹窗） */
    __webmcpcli_dialogSelectors?: string[]
  }
}
