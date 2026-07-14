/**
 * creator.xiaohongshu.com 工具适配层
 */

let attempts = 0
const MAX_ATTEMPTS = 20

async function initXhsCreatorTools() {
  const mcp = (navigator as any).modelContext
  if (!mcp || typeof mcp.registerTool !== 'function') {
    attempts++
    if (attempts < MAX_ATTEMPTS) {
      console.log(`[webmcp-tools] creator.xiaohongshu.com: registerTool 未就绪，500ms 后进行第 ${attempts} 次重试...`)
      setTimeout(initXhsCreatorTools, 500)
    } else {
      console.error('[webmcp-tools] creator.xiaohongshu.com: 达到最大重试次数，registerTool 仍未就绪')
    }
    return
  }

  const isRegistered = (() => {
    try {
      const list = (window as any).__webmcpcli_tools || []
      return list.some((t: any) => t.name === 'xhs_publish_note')
    } catch {
      return false
    }
  })()
  if (!isRegistered) {
    try {
      // 发布小红书图文笔记 (创作者中心)
      mcp.registerTool({
        name: 'xhs_publish_note',
        title: '发布小红书图文笔记',
        description: '在小红书创作者中心发布图文笔记或存为草稿。必须在 https://creator.xiaohongshu.com/publish/publish 页面执行。',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: '笔记标题，限 20 字以内'
            },
            content: {
              type: 'string',
              description: '笔记正文内容'
            },
            images: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: '图片文件名，如 image.jpg' },
                  mimeType: { type: 'string', description: '图片 MIME 类型，如 image/jpeg' },
                  base64: { type: 'string', description: '图片的 Base64 编码数据，不含 data:image/... 前缀' }
                },
                required: ['name', 'mimeType', 'base64']
              },
              description: '图片列表，最多 9 张'
            },
            topics: {
              type: 'array',
              items: { type: 'string' },
              description: '话题列表，不需要带 # 号'
            },
            draft: {
              type: 'boolean',
              description: '是否仅作为草稿保存，默认 false（即直接发布）'
            }
          },
          required: ['title', 'content', 'images']
        },
        execute: async ({ title, content, images = [], topics = [], draft = false }: { title: string; content: string; images: any[]; topics?: string[]; draft?: boolean }): Promise<any> => {
          if (!location.href.includes('creator.xiaohongshu.com/publish/publish')) {
            location.href = 'https://creator.xiaohongshu.com/publish/publish?from=menu_left&target=image'
            return {
              status: 'redirecting',
              message: '正在跳转至小红书创作者中心发布页面，跳转成功后请重新运行此工具。'
            }
          }

          if (title.length > 20) {
            throw new Error(`标题长度 (${title.length}) 超过限制，最大 20 字。`)
          }
          if (images.length === 0) {
            throw new Error('发布图文笔记至少需要提供一张图片')
          }
          if (images.length > 9) {
            throw new Error('最多只支持上传 9 张图片')
          }

          const TITLE_SELECTORS = [
            '[contenteditable="true"][placeholder*="标题"]',
            '[contenteditable="true"][placeholder*="赞"]',
            'input[placeholder*="标题"]',
            'input[placeholder*="title" i]',
            '[contenteditable="true"][class*="title"]',
            'input[maxlength="20"]',
            'input[class*="title"]',
            '.title-input input',
            '.note-title input'
          ]

          const BODY_SELECTORS = [
            '[contenteditable="true"][class*="content"]',
            '[contenteditable="true"][class*="editor"]',
            '[contenteditable="true"][placeholder*="描述"]',
            '[contenteditable="true"][placeholder*="正文"]',
            '[contenteditable="true"][placeholder*="内容"]',
            '.note-content [contenteditable="true"]',
            '.editor-content [contenteditable="true"]'
          ]

          // 1. 选择“图文”/“上传图文”标签
          const selectTab = () => {
            const isVisible = (el: HTMLElement) => {
              if (!el || el.offsetParent === null) return false
              const rect = el.getBoundingClientRect()
              return rect.width > 0 && rect.height > 0
            }
            const nodes = Array.from(document.querySelectorAll('button, [role="tab"], [role="button"], a, label, div, span, li')) as HTMLElement[]
            const targets = ['上传图文', '图文', '图片']
            for (const target of targets) {
              for (const node of nodes) {
                if (!isVisible(node)) continue
                const text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim()
                if (!text || text.includes('视频')) continue
                if (text === target || text.includes(target)) {
                  const clickable = node.closest('button, [role="tab"], [role="button"], a, label') as HTMLElement || node
                  clickable.click()
                  return true
                }
              }
            }
            return false
          }
          selectTab()
          await new Promise(resolve => setTimeout(resolve, 1000))

          // 2. 模拟文件上传
          const inputs = Array.from(document.querySelectorAll('input[type="file"]')) as HTMLInputElement[]
          const fileInput = inputs.find(el => {
            const accept = el.getAttribute('accept') || ''
            return accept.includes('image') || accept.includes('.jpg') || accept.includes('.png') || accept.includes('.webp')
          })

          if (!fileInput) {
            throw new Error('页面上未找到图片上传输入框，请确认创作者中心页面完全加载')
          }

          const dt = new DataTransfer()
          for (const img of images) {
            try {
              const binary = atob(img.base64)
              const bytes = new Uint8Array(binary.length)
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
              const blob = new Blob([bytes], { type: img.mimeType })
              dt.items.add(new File([blob], img.name, { type: img.mimeType }))
            } catch (e: any) {
              throw new Error(`处理图片 ${img.name} 的 Base64 数据失败: ` + e.message)
            }
          }

          Object.defineProperty(fileInput, 'files', { value: dt.files, writable: false })
          fileInput.dispatchEvent(new Event('change', { bubbles: true }))
          fileInput.dispatchEvent(new Event('input', { bubbles: true }))

          // 等待图片上传并由页面处理
          await new Promise(resolve => setTimeout(resolve, 3000))

          // 轮询检查上传进度条是否消失
          for (let i = 0; i < 15; i++) {
            const uploading = !!document.querySelector(
              '[class*="upload"][class*="progress"], [class*="uploading"], [class*="loading"][class*="image"]'
            )
            if (!uploading) break
            await new Promise(resolve => setTimeout(resolve, 2000))
          }

          // 3. 填入字段函数
          const fillField = (selectors: string[], text: string) => {
            let foundEl: HTMLElement | null = null
            for (const sel of selectors) {
              const candidates = Array.from(document.querySelectorAll(sel)) as HTMLElement[]
              for (const el of candidates) {
                if (el && el.offsetParent !== null) {
                  foundEl = el
                  break
                }
              }
              if (foundEl) break
            }

            if (!foundEl) return false

            foundEl.focus()
            
            const fireBeforeInput = (el: HTMLElement, val: string) => {
              el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, data: val, inputType: 'insertText' }))
            }
            const fireInput = (el: HTMLElement, val: string) => {
              el.dispatchEvent(new InputEvent('input', { bubbles: true, data: val, inputType: 'insertText' }))
            }

            fireBeforeInput(foundEl, text)

            if (foundEl.tagName === 'INPUT' || foundEl.tagName === 'TEXTAREA') {
              const el = foundEl as HTMLInputElement
              const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
              const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
              if (nativeSetter) nativeSetter.call(el, text)
              else el.value = text
              fireInput(el, text)
              el.dispatchEvent(new Event('change', { bubbles: true }))
              el.blur()
              return true
            }

            // 对于 contenteditable
            foundEl.textContent = ''
            const selection = window.getSelection()
            const range = document.createRange()
            range.selectNodeContents(foundEl)
            range.collapse(false)
            selection?.removeAllRanges()
            selection?.addRange(range)
            const inserted = document.execCommand('insertText', false, text)
            if (!inserted) foundEl.textContent = text
            fireInput(foundEl, text)
            foundEl.dispatchEvent(new Event('change', { bubbles: true }))
            foundEl.blur()
            return true
          }

          const titleFilled = fillField(TITLE_SELECTORS, title)
          if (!titleFilled) throw new Error('无法找到标题输入框或填充标题失败')
          await new Promise(resolve => setTimeout(resolve, 500))

          const contentFilled = fillField(BODY_SELECTORS, content)
          if (!contentFilled) throw new Error('无法找到正文输入框或填充正文失败')
          await new Promise(resolve => setTimeout(resolve, 500))

          // 4. 添加话题标签
          if (topics && topics.length > 0) {
            const bodyEl = BODY_SELECTORS.map(sel => Array.from(document.querySelectorAll(sel)))
              .flat()
              .find(node => node && (node as HTMLElement).offsetParent !== null && (node as HTMLElement).isContentEditable) as HTMLElement | undefined
            
            if (bodyEl) {
              for (const topic of topics) {
                bodyEl.focus()
                const selection = window.getSelection()
                const range = document.createRange()
                range.selectNodeContents(bodyEl)
                range.collapse(false)
                selection?.removeAllRanges()
                selection?.addRange(range)

                document.execCommand('insertText', false, ` #${topic}`)
                await new Promise(resolve => setTimeout(resolve, 1200)) // 等待话题弹窗

                // 查找匹配的建议项
                const SUGGESTION_SELECTORS = [
                  '[class*="topic-item"]', '[class*="hashtag-item"]', '[class*="suggest-item"]', '[class*="suggestion"] li'
                ]
                let clicked = false
                for (const sel of SUGGESTION_SELECTORS) {
                  const item = document.querySelector(sel) as HTMLElement | null
                  if (item && item.offsetParent !== null) {
                    item.click()
                    clicked = true
                    break
                  }
                }

                if (!clicked) {
                  // 如果没有弹窗或匹配项，直接回车
                  const enterEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter' })
                  bodyEl.dispatchEvent(enterEvent)
                }
                await new Promise(resolve => setTimeout(resolve, 500))
              }
            }
          }

          // 5. 点击提交发布
          const actionLabels = draft ? ['暂存离开', '存草稿'] : ['发布', '发布笔记']
          const publishNames = draft ? ['_onSave', '_onSaveDraft'] : ['_onPublish', 'onPublish', '_onSubmit']

          // 尝试 xhs-publish-btn web component 实例方法调用
          const hosts = Array.from(document.querySelectorAll('xhs-publish-btn')) as any[]
          let actionTriggered = false
          for (const host of hosts) {
            if (host.offsetParent === null) continue
            for (const name of publishNames) {
              if (typeof host[name] === 'function') {
                try {
                  host[name]()
                  actionTriggered = true
                  break
                } catch (e) {}
              }
            }
            if (actionTriggered) break
          }

          if (!actionTriggered) {
            // 尝试普通按钮点击
            const buttons = Array.from(document.querySelectorAll('button, [role="button"]')) as HTMLElement[]
            for (const btn of buttons) {
              const text = (btn.innerText || btn.textContent || '').trim()
              if (actionLabels.some(l => text === l || text.includes(l)) && btn.offsetParent !== null && !btn.disabled) {
                btn.click()
                actionTriggered = true
                break
              }
            }
          }

          if (!actionTriggered) {
            throw new Error('未找到发布或存草稿按钮，发布动作未触发')
          }

          // 等待发布结果
          await new Promise(resolve => setTimeout(resolve, 4000))
          const successMarkers = draft ? ['草稿已保存', '暂存成功', '保存成功'] : ['发布成功', '上传成功']
          let successMsg = ''
          for (const el of Array.from(document.querySelectorAll('*'))) {
            if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') continue
            const text = (el.textContent || '').trim()
            if (text.length > 200) continue
            if (el.children.length === 0 && successMarkers.some(marker => text.includes(marker))) {
              successMsg = text
              break
            }
          }

          return {
            success: true,
            action: draft ? 'draft' : 'publish',
            message: successMsg || '笔记处理完成，请在浏览器中确认结果',
            title
          }
        }
      })

      if (typeof mcp.listTools === 'function') {
        mcp.getTools().then((list: any) => {
          (window as any).__webmcpcli_tools = list
        }).catch(() => {})
      }
      console.log('[webmcp-tools] creator.xiaohongshu.com 专属工具注册成功')
    } catch (e: any) {
      console.error('[webmcp-tools] creator.xiaohongshu.com 注册失败:', e.message)
    }
  }
}

initXhsCreatorTools()
