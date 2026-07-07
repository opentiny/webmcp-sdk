import type { PageController } from '@page-agent/page-controller'
import type { PageStateCache } from './page-state-cache'
import type { RefMap } from './a11y-tree'

export interface ActionContext {
  pageController: PageController
  stateCache: PageStateCache
  getRefMap: () => RefMap
  setRefMap: (map: RefMap) => void
  buildBrowserStateResponse: (mode?: 'full' | 'diff' | 'both') => Promise<{ content: Array<{ type: 'text'; text: string }> }>
  refreshOnStaleRef: (action: string, index: number) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
  errContent: (msg: string) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
}
