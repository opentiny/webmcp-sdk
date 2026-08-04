/**
 * 使用 puppeteer-core Page / Locator 执行结构化 Recorder 步骤
 *
 * 必须从 browser 构建入口导入（与 snapshotManager 一致），
 * 禁止 `from 'puppeteer-core'` 值导入，否则会打入 @puppeteer/browsers 的 Node API 导致 Vite 构建失败。
 */

import { Locator } from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js'
import type { Page } from 'puppeteer-core'
import { resolveStepValue, type StepArgs } from './params'
import type { RecorderStep } from './types'

const DEFAULT_TIMEOUT = 5000

function raceLocator(page: Page, selectors: string[], timeout: number) {
  if (!selectors.length) {
    throw new Error('步骤缺少 selectors')
  }
  return Locator.race(selectors.map((selector) => page.locator(selector))).setTimeout(timeout)
}

/**
 * 在已连接的 Page 上按序执行 steps
 */
export async function runRecorderSteps(
  page: Page,
  steps: RecorderStep[],
  args: StepArgs = {}
): Promise<{ ok: true; completed: number } | { ok: false; completed: number; error: string }> {
  let completed = 0
  try {
    for (const step of steps) {
      const timeout =
        'timeout' in step && typeof step.timeout === 'number' ? step.timeout : DEFAULT_TIMEOUT

      switch (step.op) {
        case 'setViewport': {
          // 扩展侧连接已使用 defaultViewport: null（见 snapshotManager），
          // 若执行 Recorder 录下的 setViewport 会 Emulation 缩小视口，页面右侧出现大片空白。
          // 与现有行为一致：保留用户当前浏览器窗口/视口，跳过该步。
          break
        }
        case 'goto': {
          const url = resolveStepValue(step.url, args)
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout })
          break
        }
        case 'click': {
          const locator = raceLocator(page, step.selectors, timeout)
          if (step.offset) {
            await locator.click({ offset: step.offset })
          } else {
            await locator.click()
          }
          break
        }
        case 'hover': {
          await raceLocator(page, step.selectors, timeout).hover()
          break
        }
        case 'scroll': {
          if (step.selectors?.length) {
            await raceLocator(page, step.selectors, timeout).scroll({
              scrollLeft: 0,
              scrollTop: step.direction === 'up' ? -400 : 400
            })
          } else {
            await page.mouse.wheel({ deltaY: step.direction === 'up' ? -400 : 400 })
          }
          break
        }
        case 'type':
        case 'fill': {
          const text = resolveStepValue(step.text, args)
          // Locator 统一用 fill（清空并填入）；type 与 fill 在 MVP 语义相同
          await raceLocator(page, step.selectors, timeout).fill(text)
          break
        }
        default: {
          const _exhaustive: never = step
          throw new Error(`未知步骤: ${JSON.stringify(_exhaustive)}`)
        }
      }
      completed++
    }
    return { ok: true, completed }
  } catch (err) {
    return {
      ok: false,
      completed,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}
