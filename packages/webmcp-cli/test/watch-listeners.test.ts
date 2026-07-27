import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'events'
import type { Page } from 'puppeteer-core'
import { ensureWatcherPageListeners } from '../src/watcher-page-listeners'

describe('watch ensureWatcherPageListeners', () => {
  it('复现：同一 Page 多次 prepare/handleTarget 重复挂 framenavigated/domcontentloaded/load —— 前置 mock Page；步骤连续 ensure 两次；期望各事件仅 1 个监听', () => {
    const ee = new EventEmitter()
    const page = ee as unknown as Page
    const prepared = new WeakSet<Page>()
    const onNavigate = vi.fn()

    expect(ensureWatcherPageListeners(page, onNavigate, prepared)).toBe(true)
    expect(ensureWatcherPageListeners(page, onNavigate, prepared)).toBe(false)

    expect(ee.listenerCount('framenavigated')).toBe(1)
    expect(ee.listenerCount('domcontentloaded')).toBe(1)
    expect(ee.listenerCount('load')).toBe(1)

    ee.emit('domcontentloaded')
    ee.emit('load')
    expect(onNavigate).toHaveBeenCalledTimes(2)
  })
})
