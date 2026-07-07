import type { RefMap } from '../a11y-tree'
import {
  resolveHighlightOptions,
  type PageAgentHighlightOptions,
  type ResolvedPageAgentHighlightOptions,
} from './highlight-config'
import { HighlightRenderer } from './highlight-renderer'

export interface PageAgentRuntime {
  getHighlightConfig: () => Readonly<ResolvedPageAgentHighlightOptions>
  setHighlightEnabled: (enabled: boolean) => void
  patchHighlightConfig: (config?: PageAgentHighlightOptions) => void
  renderHighlights: (refMap: RefMap) => void
  clearHighlights: () => void
}

export function createPageAgentRuntime(
  initialHighlightConfig?: PageAgentHighlightOptions,
): PageAgentRuntime {
  let highlightConfig = resolveHighlightOptions(initialHighlightConfig)
  const renderer = new HighlightRenderer(highlightConfig)

  return {
    getHighlightConfig: () => highlightConfig,
    setHighlightEnabled: (enabled: boolean) => {
      highlightConfig = resolveHighlightOptions({ ...highlightConfig, enabled })
      renderer.updateConfig(highlightConfig)
      if (!enabled) {
        renderer.clear()
      }
    },
    patchHighlightConfig: (config?: PageAgentHighlightOptions) => {
      highlightConfig = resolveHighlightOptions({ ...highlightConfig, ...config })
      renderer.updateConfig(highlightConfig)
      if (!highlightConfig.enabled) {
        renderer.clear()
      }
    },
    renderHighlights: (refMap: RefMap) => {
      renderer.render(refMap)
    },
    clearHighlights: () => {
      renderer.clear()
    },
  }
}
