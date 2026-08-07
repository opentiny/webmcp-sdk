// 本地开发相关能力入口（勿在生产路径默认引入）
// 例如 Inspect Assist（dom-inspect）等开发辅助工具

export {
  enableInspectAssist,
  disableInspectAssist,
  buildElementMeta,
  formatElementMetaText,
  truncateHtml,
  buildDomPath,
} from './dom-inspect'
export type {
  InspectAssistOptions,
  InspectAssistHandle,
  ElementMeta,
  ElementPosition,
  ElementAttribute,
} from './dom-inspect'
