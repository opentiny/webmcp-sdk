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

.webmcp-page-agent-cursorFilling {
	position: absolute;
	width: 100%;
	height: 100%;
	background: url("data:image/svg+xml,%3Csvg%20viewBox%3D%270%200%2079.0834%2079.4553%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20%20width%3D%2779.083374%27%20height%3D%2779.455322%27%20fill%3D%27none%27%20%3E--%3Cdefs%3E%3Cfilter%20id%3D%27filter_0%27%20width%3D%2779.083374%27%20height%3D%2779.455322%27%20x%3D%270.000000%27%20y%3D%270.000000%27%20filterUnits%3D%27userSpaceOnUse%27%20%20color-interpolation-filters%3D%27sRGB%27%3E%3CfeFlood%20flood-opacity%3D%270%27%20result%3D%27BackgroundImageFix%27%20%2F%3E%3CfeOffset%20dx%3D%276.000000%27%20dy%3D%276.000000%27%20in%3D%27SourceAlpha%27%20%2F%3E%3CfeGaussianBlur%20stdDeviation%3D%276.66666651%27%20%2F%3E%3CfeColorMatrix%20type%3D%27matrix%27%20values%3D%270%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200.18%200%20%27%20%2F%3E%3CfeBlend%20result%3D%27effect_dropShadow_1%27%20in2%3D%27BackgroundImageFix%27%20mode%3D%27normal%27%20%2F%3E%3CfeBlend%20result%3D%27shape%27%20in%3D%27SourceGraphic%27%20in2%3D%27effect_dropShadow_1%27%20mode%3D%27normal%27%20%2F%3E%3C%2Ffilter%3E%3ClinearGradient%20id%3D%27paint_linear_0%27%20x1%3D%2718.4743214%27%20x2%3D%2718.4213886%27%20y1%3D%27-1.86264515e-09%27%20y2%3D%2734.9221306%27%20gradientUnits%3D%27userSpaceOnUse%27%3E%3Cstop%20stop-color%3D%27rgb%28255%2C181%2C96%29%27%20offset%3D%270%27%20stop-opacity%3D%271%27%20%2F%3E%3Cstop%20stop-color%3D%27rgb%28255%2C120%2C114%29%27%20offset%3D%270.5%27%20stop-opacity%3D%271%27%20%2F%3E%3Cstop%20stop-color%3D%27rgb%28241%2C109%2C237%29%27%20offset%3D%271%27%20stop-opacity%3D%271%27%20%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20filter%3D%27url%28%23filter_0%29%27%3E%3Cpath%20d%3D%27M20.2632%203.57771L34.6257%2032.3027C35.4444%2033.9402%2033.8152%2035.7258%2032.1097%2035.0603L19.2014%2030.0229C18.7339%2029.8404%2018.2148%2029.8404%2017.7472%2030.0229L4.83891%2035.0603C3.13343%2035.7258%201.50423%2033.9402%202.32297%2032.3027L16.6855%203.57771C17.4225%202.10361%2019.5261%202.10361%2020.2632%203.57771Z%27%20fill%3D%27url%28%23paint_linear_0%29%27%20fill-rule%3D%27evenodd%27%20transform%3D%27matrix%280.719908%2C-0.69407%2C0.69407%2C0.719908%2C2.00256%2C28.0095%29%27%20%2F%3E%3Cpath%20d%3D%27M37.2169%2032.6848C37.1578%2032.189%2037.0096%2031.7039%2036.7723%2031.2294L22.4098%202.5044C22.1973%202.07946%2021.9328%201.70554%2021.6163%201.38261C21.3524%201.11342%2021.0524%200.879671%2020.7162%200.681366C20.3925%200.490407%2020.0558%200.34434%2019.7061%200.243163C19.312%200.129145%2018.9014%200.0721366%2018.4743%200.0721366C18.0472%200.0721366%2017.6367%200.129145%2017.2426%200.243163C16.8929%200.34434%2016.5562%200.490407%2016.2324%200.681366C15.8962%200.879671%2015.5962%201.11342%2015.3323%201.38261C15.0158%201.70553%2014.7513%202.07946%2014.5388%202.5044L0.176342%2031.2294C-0.0609121%2031.7039%20-0.209128%2032.189%20-0.268305%2032.6848C-0.316251%2033.0865%20-0.305747%2033.4951%20-0.236792%2033.9108C-0.171059%2034.307%20-0.0570567%2034.6809%200.105216%2035.0326C0.292784%2035.4391%200.544845%2035.8158%200.861397%2036.1627C1.17794%2036.5097%201.53001%2036.7951%201.91761%2037.0191C2.25297%2037.2128%202.61492%2037.3606%203.00348%2037.4623C3.41106%2037.5689%203.81704%2037.6168%204.22142%2037.6058C4.72053%2037.5922%205.21719%2037.4889%205.71141%2037.2961L18.4743%2032.3154L31.2372%2037.2961C31.7315%2037.4889%2032.2281%2037.5922%2032.7272%2037.6058C33.1316%2037.6168%2033.5376%2037.5689%2033.9452%2037.4623C34.3337%2037.3606%2034.6957%2037.2128%2035.0311%2037.0191C35.4187%2036.7951%2035.7707%2036.5097%2036.0873%2036.1627C36.4038%2035.8158%2036.6558%2035.4391%2036.8434%2035.0327C37.0057%2034.681%2037.1197%2034.307%2037.1854%2033.9108C37.2544%2033.4951%2037.2649%2033.0865%2037.2169%2032.6848ZM34.6257%2032.3027L20.2632%203.57771C19.5261%202.10361%2017.4225%202.10361%2016.6855%203.57771L2.32297%2032.3027C1.50423%2033.9402%203.13343%2035.7258%204.83891%2035.0603L17.7472%2030.0229C18.2148%2029.8404%2018.7339%2029.8404%2019.2014%2030.0229L32.1097%2035.0603C33.8152%2035.7258%2035.4444%2033.9402%2034.6257%2032.3027Z%27%20fill%3D%27rgb%28255%2C255%2C255%29%27%20fill-rule%3D%27evenodd%27%20transform%3D%27matrix%280.719908%2C-0.69407%2C0.69407%2C0.719908%2C2.00256%2C28.0095%29%27%20%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E");
  background-size: 100% 100%;
	background-repeat: no-repeat;

	transform-origin: center;
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
        styles: { position: 'absolute', inset: '0' },
        glowWidth: 80,
        borderWidth: 8,
        colors: ['rgb(121, 216, 247)', 'rgb(171, 219, 110)', 'rgb(252, 188, 114)', 'rgb(235, 117, 231)']
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
    // const borderLayer = document.createElement('div')
    // borderLayer.className = 'webmcp-page-agent-cursorBorder'
    // this.#cursor.appendChild(borderLayer)

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
  // 根据目标元素大小，在 wrapper 添加绝对定位边框：2px 宽、与目标间距 2px，对角渐变 (0,0 → 1,1)
  borderElement(targetElement: HTMLElement) {
    if (!targetElement) return

    this.wrapper.querySelector('.webmcp-page-agent-border')?.remove()

    const rect = targetElement.getBoundingClientRect()
    const gap = 2
    const borderWidth = 2
    const offset = gap + borderWidth

    const el = document.createElement('div')
    el.className = 'webmcp-page-agent-border'
    el.style.position = 'absolute'
    el.style.left = `${rect.left - offset}px`
    el.style.top = `${rect.top - offset}px`
    el.style.width = `${rect.width + offset * 2}px`
    el.style.height = `${rect.height + offset * 2}px`
    el.style.boxSizing = 'border-box'
    el.style.pointerEvents = 'none'
    el.style.zIndex = '10000'
    el.style.border = `${borderWidth}px solid transparent`
    // 对角渐变：左上 (0,0) → 右下 (1,1)
    el.style.borderImageSource = 'linear-gradient(to bottom right, #79D8F7, #ABDB6E, #FCBC72, #FA8682, #EB75E7)'
    el.style.borderImageSlice = '1'
    el.style.borderImageWidth = `${borderWidth}px`

    this.wrapper.appendChild(el)
  }

  removeBorderElement() {
    this.wrapper.querySelector('.webmcp-page-agent-border')?.remove()
  }
}
