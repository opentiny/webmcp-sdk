/**
 * Recorder WebMCP 独立模块入口
 */

export { RECORDER_WEBMCP_KEY, isParamRef } from './types'
export type {
  ParamRef,
  RecorderStep,
  RecorderWebmcpTool,
  RecorderWebmcpStore,
  RecorderWebmcpToolInput
} from './types'

export { resolveStepValue, collectParamRefs } from './params'
export type { StepArgs } from './params'

export { resolveMatchingRecorderTools } from './resolve'

export { createDefaultRecorderToolMeta } from './template'

export {
  getRecorderWebmcpStore,
  setRecorderWebmcpStore,
  listRecorderWebmcpTools,
  upsertRecorderWebmcpTool,
  removeRecorderWebmcpTool,
  setRecorderWebmcpToolEnabled,
  createRecorderWebmcpToolFromTemplate,
  exportRecorderWebmcpToolsJson,
  importRecorderWebmcpToolsJson
} from './storage'
export type { UpsertResult } from './storage'

// runtime 含 puppeteer browser 入口，勿从本 barrel 再导出，避免 Options 等非侧栏入口误打包。
// 侧栏请：import { runRecorderSteps } from '@/recorder-webmcp/runtime'
