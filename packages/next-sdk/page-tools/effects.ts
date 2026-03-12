/**
 * page-tools/effects - 页面工具调用提示效果模块（框架无关）
 *
 * 作用：
 * - 在调用通过 withPageTools 注册的页面工具时，显示页面级的调用状态提示
 * - 以左下角小 tip 形式展示“当前正在调用的工具”文案，尽量不打扰用户操作
 * - 纯 DOM + CSS 实现，不依赖 Vue/React 等框架
 */

export type ToolInvokeEffectConfig = {
  /**
   * 自定义提示文案，默认使用“工具标题 || 工具名称”
   * 例如："正在为你整理订单数据"
   */
  label?: string
}

type RuntimeEffectConfig = {
  label: string
}

let overlayElement: HTMLDivElement | null = null
let labelElement: HTMLDivElement | null = null
let styleElement: HTMLStyleElement | null = null
let activeCount = 0

const BODY_GLOW_CLASS = 'next-sdk-tool-body-glow'

function ensureDomReady() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function ensureStyleElement() {
  if (!ensureDomReady()) return
  if (styleElement) return

  const style = document.createElement('style')
  style.type = 'text/css'
  style.textContent = `
  .${BODY_GLOW_CLASS} {
    position: relative;
  }

  .next-sdk-tool-overlay {
    position: fixed;
    inset: 0;
    z-index: 999999;
    pointer-events: none;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    padding: 0 0 18px 18px;
    background: transparent;
    animation: next-sdk-overlay-fade-in 260ms ease-out;
  }

  .next-sdk-tool-overlay--exit {
    animation: next-sdk-overlay-fade-out 220ms ease-in forwards;
  }

  .next-sdk-tool-overlay__glow-ring {
    display: none;
  }

  .next-sdk-tool-overlay__panel {
    position: relative;
    min-width: min(320px, 78vw);
    max-width: min(420px, 82vw);
    padding: 10px 14px;
    border-radius: 999px;
    background:
      linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(17, 24, 39, 0.9)),
      radial-gradient(circle at top left, rgba(96, 165, 250, 0.25), transparent 55%),
      radial-gradient(circle at bottom right, rgba(45, 212, 191, 0.22), transparent 60%);
    box-shadow:
      0 12px 28px rgba(15, 23, 42, 0.78),
      0 0 0 1px rgba(148, 163, 184, 0.26);
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: none;
    transform-origin: center;
    animation: next-sdk-panel-pop-in 260ms cubic-bezier(0.18, 0.89, 0.32, 1.28);
    color: #e5e7eb;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
  }

  .next-sdk-tool-overlay__indicator {
    width: 26px;
    height: 26px;
    border-radius: 999px;
    background: radial-gradient(circle at 30% 10%, #f9fafb, #93c5fd);
    box-shadow:
      0 0 0 1px rgba(191, 219, 254, 0.6),
      0 8px 18px rgba(37, 99, 235, 0.8),
      0 0 28px rgba(56, 189, 248, 0.9);
    position: relative;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .next-sdk-tool-overlay__indicator-orbit {
    position: absolute;
    inset: 2px;
    border-radius: inherit;
    border: 1px solid rgba(248, 250, 252, 0.6);
    box-sizing: border-box;
    opacity: 0.9;
  }

  .next-sdk-tool-overlay__indicator-orbit::before {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #f9fafb;
    box-shadow:
      0 0 12px rgba(248, 250, 252, 0.9),
      0 0 24px rgba(250, 249, 246, 0.9);
    top: 0;
    left: 50%;
    transform: translate(-50%, -50%);
    transform-origin: 50% 18px;
    animation: next-sdk-indicator-orbit 1.4s linear infinite;
  }

  .next-sdk-tool-overlay__indicator-core {
    width: 14px;
    height: 14px;
    border-radius: inherit;
    background: radial-gradient(circle at 30% 20%, #f9fafb, #bfdbfe);
    box-shadow:
      0 0 12px rgba(248, 250, 252, 0.9),
      0 0 32px rgba(191, 219, 254, 0.8);
    opacity: 0.96;
  }

  .next-sdk-tool-overlay__content {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .next-sdk-tool-overlay__title {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(156, 163, 175, 0.96);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .next-sdk-tool-overlay__title-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #22c55e;
    box-shadow:
      0 0 8px rgba(34, 197, 94, 0.9),
      0 0 14px rgba(22, 163, 74, 0.9);
  }

  .next-sdk-tool-overlay__label {
    font-size: 12px;
    font-weight: 500;
    color: #e5e7eb;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  @keyframes next-sdk-overlay-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes next-sdk-overlay-fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes next-sdk-indicator-orbit {
    from {
      transform: translate(-50%, -50%) rotate(0deg) translateY(0);
    }
    to {
      transform: translate(-50%, -50%) rotate(360deg) translateY(0);
    }
  }

  @keyframes next-sdk-panel-pop-in {
    0% {
      opacity: 0;
      transform: scale(0.92) translateY(10px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  `

  document.head.appendChild(style)
  styleElement = style
}

function ensureOverlayElement() {
  if (!ensureDomReady()) return
  if (overlayElement) return

  ensureStyleElement()

  const overlay = document.createElement('div')
  overlay.className = 'next-sdk-tool-overlay'

  const glowRing = document.createElement('div')
  glowRing.className = 'next-sdk-tool-overlay__glow-ring'

  const panel = document.createElement('div')
  panel.className = 'next-sdk-tool-overlay__panel'

  const indicator = document.createElement('div')
  indicator.className = 'next-sdk-tool-overlay__indicator'

  const indicatorOrbit = document.createElement('div')
  indicatorOrbit.className = 'next-sdk-tool-overlay__indicator-orbit'

  const indicatorCore = document.createElement('div')
  indicatorCore.className = 'next-sdk-tool-overlay__indicator-core'

  const content = document.createElement('div')
  content.className = 'next-sdk-tool-overlay__content'

  const titleRow = document.createElement('div')
  titleRow.className = 'next-sdk-tool-overlay__title'
  titleRow.textContent = 'AI 正在调用页面工具'

  const titleDot = document.createElement('span')
  titleDot.className = 'next-sdk-tool-overlay__title-dot'

  const label = document.createElement('div')
  label.className = 'next-sdk-tool-overlay__label'

  titleRow.prepend(titleDot)
  content.appendChild(titleRow)
  content.appendChild(label)

  indicator.appendChild(indicatorOrbit)
  indicator.appendChild(indicatorCore)
  panel.appendChild(indicator)
  panel.appendChild(content)
  overlay.appendChild(glowRing)
  overlay.appendChild(panel)

  document.body.appendChild(overlay)

  overlayElement = overlay
  labelElement = label
}

function updateOverlay(config: RuntimeEffectConfig) {
  if (!ensureDomReady()) return
  ensureOverlayElement()
  if (!overlayElement || !labelElement) return
  overlayElement.classList.remove('next-sdk-tool-overlay--exit')
  labelElement.textContent = config.label
}

function removeOverlayWithAnimation() {
  if (!overlayElement) return
  overlayElement.classList.add('next-sdk-tool-overlay--exit')
  const localOverlay = overlayElement
  const handle = () => {
    if (localOverlay.parentNode) {
      localOverlay.parentNode.removeChild(localOverlay)
    }
    if (overlayElement === localOverlay) {
      overlayElement = null
      labelElement = null
    }
    localOverlay.removeEventListener('animationend', handle)
  }
  localOverlay.addEventListener('animationend', handle)
}

/**
 * 在页面上显示工具调用提示效果。
 * - 若当前已有其他工具在执行，仅更新文案，不重复创建 DOM
 * - 会增加 activeCount 计数，需配对调用 hideToolInvokeEffect
 */
export function showToolInvokeEffect(config: RuntimeEffectConfig) {
  if (!ensureDomReady()) return
  activeCount += 1
  updateOverlay(config)
}

/**
 * 隐藏工具调用提示效果。
 * - 使用引用计数：只有当所有调用结束后才真正移除 Overlay
 */
export function hideToolInvokeEffect() {
  if (!ensureDomReady() || activeCount <= 0) return
  activeCount -= 1
  if (activeCount === 0) {
    removeOverlayWithAnimation()
  }
}

/**
 * 将 RouteConfig 中的 invokeEffect 配置编译成运行时效果配置。
 * - boolean / undefined：关闭或开启默认文案
 * - 对象：允许自定义 label
 */
export function resolveRuntimeEffectConfig(
  toolName: string,
  toolTitle: string | undefined,
  value: boolean | ToolInvokeEffectConfig | undefined
): RuntimeEffectConfig | undefined {
  if (!value) return undefined
  const baseLabel = toolTitle || toolName
  if (typeof value === 'boolean') {
    return value ? { label: baseLabel } : undefined
  }
  return {
    label: value.label || baseLabel
  }
}

