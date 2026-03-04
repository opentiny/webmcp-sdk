// 统一的“智能填写按钮”初始化逻辑，既给工具调用，也给页面加载时调用
const setupSmartFillButton = () => {
  const getButtonText = (el: Element | null) => (el?.textContent || '').replace(/\s/g, '')

  // 使用事件代理监听整个页面的点击，保证“无标题”按钮是后渲染/替换也能捕获到
  window.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      // 向上找到最近的 button 或 tiny-button 元素
      const button = target.closest('button, [class*="tiny-button"]')
      if (!button) return
//
      // 只处理文案包含“无标题”的按钮
      if (!getButtonText(button).includes('无标题')) return

      // 等弹窗渲染完成，这里延迟 1 秒再去找“确 定”按钮
      setTimeout(() => {
        const attachSmartFill = () => {
          // 查找所有候选“确定/确认/保存/提交”按钮，通常位于弹窗底部
          const candidates = Array.from(document.querySelectorAll('button, [class*="tiny-button"]'))

          const confirmButton = candidates.find((el) => {
            const text = getButtonText(el)
            return (
              text.includes('确 定') ||
              text.includes('确定') ||
              text.includes('确认') ||
              text.includes('保存') ||
              text.includes('提交')
            )
          })

          if (!confirmButton || !confirmButton.parentElement) {
            return false
          }

          // 避免重复添加“智能填写”按钮
          const existedSmartFill = Array.from(
            confirmButton.parentElement.querySelectorAll('button, [class*="tiny-button"]')
          ).find((el) => getButtonText(el).includes('智能填写'))

          if (existedSmartFill) {
            return true
          }

          // 克隆一个与“确定”按钮同结构的按钮，保证样式一致
          const smartFillButton = confirmButton.cloneNode(true) as HTMLElement
          smartFillButton.textContent = '智能填写'

          // 将“智能填写”按钮插入到“确定”按钮后面
          confirmButton.parentElement.insertBefore(smartFillButton, confirmButton.nextSibling)

          // 监听“智能填写”按钮点击事件
          smartFillButton.addEventListener('click', () => {
            const e = new CustomEvent('next-sdk:smart-fill-click')
            window.dispatchEvent(e)
          })

          return true
        }

        // 先尝试一次
        let attached = attachSmartFill()

        // 如果这时还没找到“确定”按钮，则再用 MutationObserver 监听后续 DOM 变化
        if (!attached && document.body) {
          const observer = new MutationObserver(() => {
            attached = attachSmartFill()
            if (attached) {
              observer.disconnect()
            }
          })

          observer.observe(document.body, {
            childList: true,
            subtree: true
          })
        }
      }, 1000)
    },
    true
  )
}

export default ({ server, z }) => {
  // Add an addition tool
  server.registerTool(
    'generate-color',
    {
      title: '生成页面背景颜色',
      description: '根据用户的心情或者情绪生成页面的背景颜色,要求：传入的color参数格式为十六进制颜色值,比如 #000000',
      inputSchema: { color: z.string() }
    },
    async ({ color }) => {
      document.body.style.backgroundColor = color
      return {
        content: [{ type: 'text', text: String(color) }]
      }
    }
  )

  // 添加一个工具，用于在弹窗中追加“智能填写”按钮
  server.registerTool(
    'setup-smart-fill-button',
    {
      title: '添加智能填写按钮',
      description: '在点击“无标题”按钮后出现的弹窗中，在“确定”按钮旁边追加一个“智能填写”按钮，并监听该按钮的点击事件',
      // 此工具不需要输入参数
      inputSchema: {}
    },
    async () => {
      await setupSmartFillButton()
      alert('已启用“智能填写”按钮监听逻辑：当弹窗中的“确定”按钮出现时，会在其旁边追加“智能填写”按钮。')
      return {
        content: [
          {
            type: 'text',
            text: '已启用“智能填写”按钮监听逻辑：当弹窗中的“确定”按钮出现时，会在其旁边追加“智能填写”按钮。'
          }
        ]
      }
    }
  )

  // 页面加载完成后，自动调用一次“智能填写按钮”初始化逻辑
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      window.addEventListener('load', () => {
        setupSmartFillButton()
      })
    } else {
      setupSmartFillButton()
    }
  }
}
