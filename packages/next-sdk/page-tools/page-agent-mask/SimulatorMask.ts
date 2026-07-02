import { Motion } from 'ai-motion'

import { isPageDark } from './checkDarkMode'

const injectStyles = `
.webmcp-page-agent-cursor {
	position: absolute;
	width: var(--cursor-size, 75px);
	height: var(--cursor-size, 75px);
	pointer-events: none;
	z-index: 10000;
}

.webmcp-page-agent-cursorBorder {
	position: absolute;
	width: 100%;
	height: 100%;
	background: linear-gradient(45deg, rgb(57, 182, 255), rgb(189, 69, 251));
	mask-image: url("data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%20fill='none'%3e%3cg%3e%3cpath%20d='M%2015%2042%20L%2015%2036.99%20Q%2015%2031.99%2023.7%2031.99%20L%2028.05%2031.99%20Q%2032.41%2031.99%2032.41%2021.99%20L%2032.41%2017%20Q%2032.41%2012%2041.09%2016.95%20L%2076.31%2037.05%20Q%2085%2042%2076.31%2046.95%20L%2041.09%2067.05%20Q%2032.41%2072%2032.41%2062.01%20L%2032.41%2057.01%20Q%2032.41%2052.01%2023.7%2052.01%20L%2019.35%2052.01%20Q%2015%2052.01%2015%2047.01%20Z'%20fill='none'%20stroke='%23000000'%20stroke-width='6'%20stroke-miterlimit='10'%20style='stroke:%20light-dark(rgb(0,%200,%200),%20rgb(255,%20255,%20255));'/%3e%3c/g%3e%3c/svg%3e");
	mask-size: 100% 100%;
	mask-repeat: no-repeat;

	transform-origin: center;
	transform: rotate(-90deg) scale(0.8);
	margin-left: -10px;
	margin-top: -18px;
}

.webmcp-page-agent-cursorFilling {
	position: absolute;
	width: 100%;
	height: 100%;
	background: url("data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3e%3cdefs%3e%3c/defs%3e%3cg%20xmlns='http://www.w3.org/2000/svg'%20style='filter:%20drop-shadow(light-dark(rgba(0,%200,%200,%200.4),%20rgba(237,%20237,%20237,%200.4))%203px%204px%204px);'%3e%3cpath%20d='M%2015%2042%20L%2015%2036.99%20Q%2015%2031.99%2023.7%2031.99%20L%2028.05%2031.99%20Q%2032.41%2031.99%2032.41%2021.99%20L%2032.41%2017%20Q%2032.41%2012%2041.09%2016.95%20L%2076.31%2037.05%20Q%2085%2042%2076.31%2046.95%20L%2041.09%2067.05%20Q%2032.41%2072%2032.41%2062.01%20L%2032.41%2057.01%20Q%2032.41%2052.01%2023.7%2052.01%20L%2019.35%2052.01%20Q%2015%2052.01%2015%2047.01%20Z'%20fill='%23ffffff'%20stroke='none'%20style='fill:%20%23ffffff;'/%3e%3c/g%3e%3c/svg%3e");
	background-size: 100% 100%;
	background-repeat: no-repeat;

	transform-origin: center;
	transform: rotate(-90deg) scale(0.8);
	margin-left: -10px;
	margin-top: -18px;
}

.webmcp-page-agent-cursorRipple {
	position: absolute;
	width: 100%;
	height: 100%;
	pointer-events: none;
	margin-left: -50%;
	margin-top: -50%;

	&::after {
		content: '';
		opacity: 0;
		position: absolute;
		inset: 0;
		border: 4px solid rgba(57, 182, 255, 1);
		border-radius: 50%;
	}
}

.webmcp-page-agent-cursor.clicking .webmcp-page-agent-cursorRipple::after {
	animation: webmcp-page-agent-cursor-ripple 300ms ease-out forwards;
}

@keyframes webmcp-page-agent-cursor-ripple {
	0% {
		transform: scale(0);
		opacity: 1;
	}

	100% {
		transform: scale(2);
		opacity: 0;
	}
}

.webmcp-page-agent-wrapper {
	position: fixed;
	inset: 0;
	z-index: 2147483641;
	/* 确保在所有元素之上，除了 panel */
	cursor: wait;
	overflow: hidden;

	display: none;
}

.webmcp-page-agent-wrapper.visible {
	display: block;
}
`

export class SimulatorMask extends EventTarget {
  shown: boolean = false
  wrapper = document.createElement('div')
  motion: Motion | null = null

  #disposed = false

  #cursor = document.createElement('div')

  #currentCursorX = 0
  #currentCursorY = 0

  #targetCursorX = 0
  #targetCursorY = 0

  constructor() {
    super()
    // 注入样式，防止打包失败
    document.head.appendChild(document.createElement('style')).textContent = injectStyles
    this.wrapper.id = 'page-agent-runtime_simulator-mask'
    this.wrapper.className = 'webmcp-page-agent-wrapper'
    this.wrapper.setAttribute('data-browser-use-ignore', 'true')
    this.wrapper.setAttribute('data-page-agent-ignore', 'true')

    try {
      const motion = new Motion({
        mode: isPageDark() ? 'dark' : 'light',
        styles: { position: 'absolute', inset: '0' }
      })
      this.motion = motion
      this.wrapper.appendChild(motion.element)
      motion.autoResize(this.wrapper)
    } catch (e) {
      console.warn('[SimulatorMask] Motion overlay unavailable:', e)
    }

    const stopEvent = (e: Event) => {
      e.stopPropagation()
      e.preventDefault()
    }
    ;['click', 'mousedown', 'mouseup', 'mousemove', 'wheel', 'keydown', 'keyup'].forEach((eventName) =>
      this.wrapper.addEventListener(eventName, stopEvent)
    )
    // Create AI cursor
    this.#createCursor()
    // this.show()

    document.body.appendChild(this.wrapper)

    this.#moveCursorToTarget()

    // global events
    // @note Mask should be isolated from the rest of the code.
    // Global events are easier to manage and cleanup.

    const movePointerToListener = (event: Event) => {
      const { x, y } = (event as CustomEvent).detail
      this.setCursorPosition(x, y)
    }
    const clickPointerListener = () => {
      this.triggerClickAnimation()
    }
    const enablePassThroughListener = () => {
      this.wrapper.style.pointerEvents = 'none'
    }
    const disablePassThroughListener = () => {
      this.wrapper.style.pointerEvents = 'auto'
    }

    window.addEventListener('PageAgent::MovePointerTo', movePointerToListener)
    window.addEventListener('PageAgent::ClickPointer', clickPointerListener)
    window.addEventListener('PageAgent::EnablePassThrough', enablePassThroughListener)
    window.addEventListener('PageAgent::DisablePassThrough', disablePassThroughListener)

    this.addEventListener('dispose', () => {
      window.removeEventListener('PageAgent::MovePointerTo', movePointerToListener)
      window.removeEventListener('PageAgent::ClickPointer', clickPointerListener)
      window.removeEventListener('PageAgent::EnablePassThrough', enablePassThroughListener)
      window.removeEventListener('PageAgent::DisablePassThrough', disablePassThroughListener)
    })
  }

  #createCursor() {
    this.#cursor.className = 'webmcp-page-agent-cursor'

    // Create ripple effect container
    const rippleContainer = document.createElement('div')
    rippleContainer.className = 'webmcp-page-agent-cursorRipple'
    this.#cursor.appendChild(rippleContainer)

    // Create filling layer
    const fillingLayer = document.createElement('div')
    fillingLayer.className = 'webmcp-page-agent-cursorFilling'
    this.#cursor.appendChild(fillingLayer)

    // Create border layer
    const borderLayer = document.createElement('div')
    borderLayer.className = 'webmcp-page-agent-cursorBorder'
    this.#cursor.appendChild(borderLayer)

    this.wrapper.appendChild(this.#cursor)
  }

  #moveCursorToTarget() {
    if (this.#disposed) return

    const newX = this.#currentCursorX + (this.#targetCursorX - this.#currentCursorX) * 0.2
    const newY = this.#currentCursorY + (this.#targetCursorY - this.#currentCursorY) * 0.2

    const xDistance = Math.abs(newX - this.#targetCursorX)
    if (xDistance > 0) {
      if (xDistance < 2) {
        this.#currentCursorX = this.#targetCursorX
      } else {
        this.#currentCursorX = newX
      }
      this.#cursor.style.left = `${this.#currentCursorX}px`
    }

    const yDistance = Math.abs(newY - this.#targetCursorY)
    if (yDistance > 0) {
      if (yDistance < 2) {
        this.#currentCursorY = this.#targetCursorY
      } else {
        this.#currentCursorY = newY
      }
      this.#cursor.style.top = `${this.#currentCursorY}px`
    }

    requestAnimationFrame(() => this.#moveCursorToTarget())
  }

  setCursorPosition(x: number, y: number) {
    if (this.#disposed) return

    this.#targetCursorX = x
    this.#targetCursorY = y
  }

  triggerClickAnimation() {
    if (this.#disposed) return

    this.#cursor.classList.remove('clicking')
    // Force reflow to restart animation
    void this.#cursor.offsetHeight
    this.#cursor.classList.add('clicking')
  }

  show() {
    if (this.shown || this.#disposed) return

    this.shown = true
    this.motion?.start()
    this.motion?.fadeIn()

    this.wrapper.classList.add('visible')

    // Initialize cursor position
    this.#currentCursorX = window.innerWidth / 2
    this.#currentCursorY = window.innerHeight / 2
    this.#targetCursorX = this.#currentCursorX
    this.#targetCursorY = this.#currentCursorY
    this.#cursor.style.left = `${this.#currentCursorX}px`
    this.#cursor.style.top = `${this.#currentCursorY}px`
  }

  hide() {
    if (!this.shown || this.#disposed) return

    this.shown = false
    this.motion?.fadeOut()
    this.motion?.pause()

    this.#cursor.classList.remove('clicking')

    setTimeout(() => {
      this.wrapper.classList.remove('visible')
    }, 800) // Match the animation duration
  }

  dispose() {
    this.#disposed = true
    this.motion?.dispose()
    this.wrapper.remove()
    this.dispatchEvent(new Event('dispose'))
  }
}
