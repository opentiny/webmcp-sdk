/**
 * my.oschina.net 工具适配层
 */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function toToolResult(data: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data) }]
  }
}

function isOschinaWritePage(): boolean {
  return location.href.startsWith('https://my.oschina.net/u') && location.href.endsWith('/blog/ai-write')
}

function readArticleFromEditor(): { title: string; content: string } {
  const titleInput = document.querySelector('.title-input-container .title-input') as HTMLInputElement | null
  const title = titleInput?.value?.trim() || ''

  const editor = document.querySelector('.v-md-textarea-editor textarea') as HTMLTextAreaElement | null
  const content = editor?.value || ''

  return { title, content }
}

const mcp = (navigator as any).modelContext
if (!mcp || typeof mcp.registerTool !== 'function') {
  console.warn('[webmcp-tools] my.oschina.net: document.modelContext.registerTool 未就绪，跳过注入')
} else if (!(window as any).__webmcptools_myoschinanet) {
  try {
    mcp.registerTool({
      name: 'create_article',
      title: '发布新文章',
      description: '接收文章的标题和正文，将它们填写到开源中国编辑器中。',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '文章标题，必填，建议不超过 100 字，不允许有特殊符号影响命令行参数解析'
          },
          content: {
            type: 'string',
            description: '文章内容的 Base64 编码字符串，必填。'
          }
        },
        required: ['title', 'content']
      },
      execute: async ({ title, content }: { title: string; content: string }) => {
        if (!title?.trim()) {
          throw new Error('参数 title 不能为空')
        }
        if (!content?.trim()) {
          throw new Error('参数 content 不能为空')
        }

        if (!isOschinaWritePage()) {
          throw new Error('当前页面不是发布页面，请先打开 https://my.oschina.net/u/<uid>/blog/ai-write')
        }

        let decodeContent: string
        try {
          decodeContent = decodeURIComponent(escape(atob(content)))
        } catch {
          throw new Error('content 不是有效的 Base64 编码，请检查参数或使用 @base64file: 引用文件')
        }

        const switchBtn = document.querySelector('.editor-switch-btn') as HTMLButtonElement | null
        if (switchBtn) {
          switchBtn.click()
        }
        await sleep(300)

        const titleInput = document.querySelector('.title-input-container .title-input') as HTMLInputElement | null
        if (!titleInput) {
          throw new Error('未找到标题输入框，请确认编辑器页面已完全加载')
        }

        titleInput.focus()
        titleInput.value = title
        titleInput.dispatchEvent(
          new InputEvent('input', { bubbles: true, cancelable: true, data: title })
        )
        titleInput.dispatchEvent(new Event('change', { bubbles: true }))
        titleInput.blur()

        if (titleInput.value.trim() !== title.trim()) {
          throw new Error('标题填写失败，请刷新页面后重试')
        }

        await sleep(300)

        const editor = document.querySelector('.v-md-textarea-editor textarea') as HTMLTextAreaElement | null
        if (!editor) {
          throw new Error('未找到正文编辑器')
        }

        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
        editor.focus()
        if (nativeSetter) {
          nativeSetter.call(editor, decodeContent)
        } else {
          editor.value = decodeContent
        }
        editor.dispatchEvent(new InputEvent('input', { bubbles: true }))
        editor.dispatchEvent(new Event('change', { bubbles: true }))
        editor.blur()

        return toToolResult({
          success: true,
          message: '文章标题和正文已成功填写到开源中国编辑器，草稿将自动保存',
          title: title.trim(),
          contentLength: decodeContent.length
        })
      }
    })

    mcp.registerTool({
      name: 'get_article_info',
      title: '获取当前开源中国文章信息',
      description:
        '在开源中国编辑器页面中获取当前文章的标题和正文，以便 AI 分析主题、选择合适的分类与标签，或生成摘要。',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        if (!isOschinaWritePage()) {
          throw new Error('当前页面不是发布页面，请先打开 https://my.oschina.net/u/<uid>/blog/ai-write')
        }

        const { title, content } = readArticleFromEditor()
        return toToolResult({
          success: true,
          title,
          contentLength: content.length,
          content
        })
      }
    })

    mcp.registerTool({
      name: 'publish_current_draft',
      title: '一键发布当前开源中国草稿',
      description:
        '在开源中国编辑器中自动填写标签、分类并点击发布。调用前 AI 必须先使用 get_article_info 获取正文，智能推断 category 与 tags，并生成 50~200 字摘要，切勿盲目使用默认值。',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: '文章分类/专区，如「开源资讯」「软件架构」「前端」等，默认「开源资讯」'
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: '文章标签数组，必填 1~5 个。AI 应先读取正文提炼核心技术栈标签'
          },
          summary: {
            type: 'string',
            description: '文章摘要，必填，建议 50~200 字。调用前 AI 须基于 get_article_info 自主总结。'
          }
        },
        required: ['tags', 'summary']
      },
      execute: async ({
        category = '开源资讯',
        tags,
        summary
      }: {
        category?: string
        tags: string[]
        summary: string
      }) => {
        if (!isOschinaWritePage()) {
          throw new Error('当前页面不是发布页面，请先 tabs switch 到编辑器标签页后再发布')
        }

        if (!tags?.length) {
          throw new Error('参数 tags 不能为空，请至少提供一个标签')
        }

        const finalSummary = summary?.trim() || ''
        if (!finalSummary) {
          throw new Error('参数 summary 不能为空')
        }
        if (finalSummary.length < 20) {
          throw new Error(`摘要过短（${finalSummary.length} 字），建议至少 20 字`)
        }

        // 1. 填写摘要（如有摘要输入框）
        const summaryInput = (
          document.querySelector('textarea[placeholder*="摘要"]') ||
          document.querySelector('input[placeholder*="摘要"]') ||
          document.querySelector('[class*="summary"] textarea')
        ) as HTMLTextAreaElement | HTMLInputElement | null

        if (summaryInput) {
          const nativeSetter = Object.getOwnPropertyDescriptor(
            summaryInput instanceof HTMLTextAreaElement
              ? HTMLTextAreaElement.prototype
              : HTMLInputElement.prototype,
            'value'
          )?.set
          summaryInput.focus()
          if (nativeSetter) {
            nativeSetter.call(summaryInput, finalSummary)
          } else {
            summaryInput.value = finalSummary
          }
          summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }))
          summaryInput.dispatchEvent(new Event('change', { bubbles: true }))
          await sleep(300)
        }

        // 2. 选择分类/专区
        const catEl = Array.from(
          document.querySelectorAll('select option, li, label, span, div, button')
        ).find((el) => el.textContent?.trim() === category && (el as HTMLElement).offsetParent !== null) as
          | HTMLElement
          | undefined
        if (catEl) {
          catEl.click()
          await sleep(300)
        }

        // 3. 添加标签
        const tagInput = (
          document.querySelector('input[placeholder*="标签"]') ||
          document.querySelector('[class*="tag"] input')
        ) as HTMLInputElement | null

        const addedTags: string[] = []
        if (tagInput) {
          for (const tag of tags.slice(0, 5)) {
            tagInput.focus()
            tagInput.click()
            const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
            if (nativeSetter) {
              nativeSetter.call(tagInput, tag)
            } else {
              tagInput.value = tag
            }
            tagInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: tag }))
            await sleep(600)

            const suggestion = Array.from(
              document.querySelectorAll('[class*="suggestion"], [class*="dropdown"] li, .el-select-dropdown__item')
            ).find((el) => el.textContent?.trim().includes(tag)) as HTMLElement | undefined
            if (suggestion) {
              suggestion.click()
            } else {
              tagInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
            }
            addedTags.push(tag)
            await sleep(400)
          }
        }

        // 4. 点击发布按钮
        const publishBtn = Array.from(document.querySelectorAll('button, a')).find((el) => {
          const text = el.textContent?.trim() || ''
          return (
            (text === '发布' || text === '发布博客' || text === '立即发布' || text.includes('发布文章')) &&
            (el as HTMLElement).offsetParent !== null
          )
        }) as HTMLElement | undefined

        if (!publishBtn) {
          throw new Error('未找到「发布」按钮，请确认编辑器页面已完全加载')
        }

        publishBtn.click()
        await sleep(2500)

        return toToolResult({
          success: true,
          message: `开源中国发布流程已触发，分类: ${category}，标签: ${addedTags.join(', ') || tags.join(', ')}`,
          category,
          tags: addedTags.length ? addedTags : tags,
          summary: finalSummary,
          url: location.href
        })
      }
    })

    ;(window as any).__webmcptools_myoschinanet = true
    console.log('[webmcp-tools] my.oschina.net 工具注册成功')
  } catch (e: any) {
    console.error('[webmcp-tools] my.oschina.net 工具注册失败:', e.message)
  }
}
