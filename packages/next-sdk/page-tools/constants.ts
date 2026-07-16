/** 校验错误/弹窗/tooltip 默认选择器：ARIA 标准 + 主流 UI 框架（唯一来源为 a11y/constants.ts，此处重新导出保持旧路径可用） */
export { DEFAULT_ERROR_SELECTORS, DEFAULT_DIALOG_SELECTORS, DEFAULT_TOOLTIP_SELECTORS } from './a11y/constants'

/** 框架级 role 覆盖规则：为非标准 UI 组件推断 ARIA 角色（已纳入 DEFAULT_A11Y_CONFIG.roles，此处重新导出保持旧路径可用） */
export { DEFAULT_ROLE_OVERRIDES, type RoleOverride } from './a11y/constants'

/** registerPageAgentTool(options) 的入参类型，定义见 tool-config.ts（与运行期 setPageAgentToolConfig 的补丁类型一致） */
export type { PageAgentToolOptions } from './tool-config'

/** CLI 端预扫描结果项：tp-helptip 索引 → 文本 + 类型 */
export interface PreScannedTooltip {
  index: number
  text: string
  type: 'tooltip' | 'button'
}

declare global {
  interface Window {
    /** 指定网站可覆盖该函数，在每次 getBrowserState 之前调用，常用于配合 setPageAgentToolConfig 动态调整当前页面的配置 */
    __webmcpcli_beforeGetBrowserState?: (() => void) | null
    /** 动态 tooltip 缓存：scanForDynamicTooltips 自动 hover 扫描结果，element → tooltip 文本 */
    __webmcpcli_dynamicTooltipCache?: WeakMap<Element, string>
    /** CLI 端预扫描结果：tp-helptip 索引 → 文本 + 类型（hover 识别 tooltip / click 识别帮助按钮弹窗） */
    __webmcpcli_preScannedTooltips?: PreScannedTooltip[]
  }
}
