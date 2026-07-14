import type { A11yConfig } from './a11y/config'

/** 校验错误默认选择器：ARIA 标准 + 主流 UI 框架（唯一来源为 a11y/constants.ts，此处重新导出保持旧路径可用） */
export { DEFAULT_ERROR_SELECTORS, DEFAULT_DIALOG_SELECTORS } from './a11y/constants'

export interface PageAgentToolOptions {
  /** 是否启用元素高亮 */
  enableHighlight?: boolean
  /**
   * 统一无障碍配置：按角色（roles）、状态（states：selected/disabled/error/warning 等）自定义规则，
   * 以及白名单/黑名单/自定义暴露属性/弹窗选择器。会与默认配置合并生效，运行期可通过 setA11yConfig 继续修改。
   */
  a11yConfig?: A11yConfig
}

declare global {
  interface Window {
    /** 指定网站可覆盖该函数，在每次 getBrowserState 之前调用，常用于配合 setA11yConfig 动态调整当前页面的无障碍配置 */
    __webmcpcli_beforeGetBrowserState?: (() => void) | null
    /** 运行期唯一生效的统一无障碍配置（已与默认值合并），可通过 getA11yConfig/setA11yConfig 读写 */
    __webmcpcli_a11yConfig?: Required<A11yConfig>
  }
}
