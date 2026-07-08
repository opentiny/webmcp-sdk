/**
 * xiaohongshu.com 工具适配层
 */

type NoteResult = {
  title: string
  author: string
  content: string
  likes: string
  collects: string
  comments: string
  tags: string
}

type FeedItem = {
  id: string
  title: string
  type: string
  author: string
  likes: string
  url: string
}

type SearchItem = {
  title: string
  author: string
  likes: string
  url: string
  published_at: string
  author_url: string
}

let attempts = 0
const MAX_ATTEMPTS = 20

async function initXhsTools() {
  const mcp = (navigator as any).modelContext
  if (!mcp || typeof mcp.registerTool !== 'function') {
    attempts++
    if (attempts < MAX_ATTEMPTS) {
      console.log(`[webmcp-tools] xiaohongshu.com: registerTool 未就绪，500ms 后进行第 ${attempts} 次重试...`)
      setTimeout(initXhsTools, 500)
    } else {
      console.error('[webmcp-tools] xiaohongshu.com: 达到最大重试次数，registerTool 仍未就绪')
    }
    return
  }

  const isRegistered = (() => {
    try {
      const list = (window as any).__webmcpcli_tools || []
      return list.some((t: any) => t.name === 'xhs_get_note_detail')
    } catch {
      return false
    }
  })()
  if (!isRegistered) {
    try {
    // 1. 获取小红书笔记正文和互动数据
    mcp.registerTool({
      name: 'xhs_get_note_detail',
      title: '获取小红书笔记详情',
      description: '获取当前查看的小红书笔记的详细信息，包含标题、作者、正文、点赞数、收藏数、评论数及标签。',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      execute: async (): Promise<NoteResult> => {
        const bodyText = document.body?.innerText || ''
        const loginWall = /登录后查看|请登录/.test(bodyText)
        const notFound = /页面不见了|笔记不存在|无法浏览/.test(bodyText)
        const securityBlock = /安全限制|访问链接异常/.test(bodyText)
          || /website-login\/error|error_code=300017|error_code=300031/.test(location.href)

        const clean = (el: Element | null) => (el?.textContent || '').replace(/\s+/g, ' ').trim()

        const title = clean(document.querySelector('#detail-title, .title'))
        const desc = clean(document.querySelector('#detail-desc, .desc, .note-text'))
        const author = clean(document.querySelector('.username, .author-wrapper .name'))
        
        const likes = clean(document.querySelector('.interact-container .like-wrapper .count'))
        const collects = clean(document.querySelector('.interact-container .collect-wrapper .count'))
        const comments = clean(document.querySelector('.interact-container .chat-wrapper .count'))

        const tags: string[] = []
        document.querySelectorAll('#detail-desc a.tag, #detail-desc a[href*="search_result"]').forEach(el => {
          const t = (el.textContent || '').trim()
          if (t) tags.push(t)
        })

        if (securityBlock) {
          throw new Error('小红书风控安全限制，请稍后再试或更换登录账号')
        }
        if (loginWall) {
          throw new Error('此笔记内容需要登录后查看')
        }
        if (notFound) {
          throw new Error('未找到该笔记或该笔记已被限制/删除')
        }

        const numOrZero = (v: string) => /^\d+/.test(v) ? v : '0'

        return {
          title,
          author,
          content: desc,
          likes: numOrZero(likes),
          collects: numOrZero(collects),
          comments: numOrZero(comments),
          tags: tags.join(', ')
        }
      }
    })

    // 2. 获取首页推荐 Feed 列表
    mcp.registerTool({
      name: 'xhs_get_feed',
      title: '获取小红书首页推荐Feed',
      description: '从小红书首页获取推荐的笔记列表。必须在 https://www.xiaohongshu.com/explore 页面执行。',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '限制获取的推荐笔记数量，默认 20 条，最大不超过 50'
          }
        }
      },
      execute: async ({ limit = 20 }: { limit?: number }): Promise<FeedItem[]> => {
        if (!location.href.includes('xiaohongshu.com/explore')) {
          throw new Error('请先切换到小红书首页列表页 https://www.xiaohongshu.com/explore')
        }

        let pinia: any = null
        const probe = (el: any) => el?.__vue_app__?.config?.globalProperties?.$pinia ?? null
        pinia = probe(document.querySelector('#app'))
        if (!pinia) {
          for (const el of Array.from(document.querySelectorAll('*'))) {
            pinia = probe(el)
            if (pinia) break
          }
        }
        if (!pinia || !pinia._s) {
          throw new Error('页面尚未完成加载或未找到 Pinia 实例，请等待一两秒后重试')
        }
        const store = pinia._s.get('feed')
        if (!store) {
          throw new Error('未找到 Pinia 中的 feed 状态')
        }
        const feeds = store.feeds
        if (!Array.isArray(feeds)) {
          throw new Error('获取推荐 Feed 数据失败，数据格式不正确')
        }

        const toCleanString = (value: any) => typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
        const buildFeedNoteUrl = (id: string, xsecToken: string) => {
          const cleanId = toCleanString(id)
          const url = new URL(`https://www.xiaohongshu.com/explore/${encodeURIComponent(cleanId)}`)
          const cleanToken = toCleanString(xsecToken)
          if (!cleanToken) return url.toString()
          url.searchParams.set('xsec_token', cleanToken)
          url.searchParams.set('xsec_source', '')
          return url.toString()
        }

        const rows: FeedItem[] = []
        for (const entry of feeds) {
          if (rows.length >= limit) break
          const card = entry?.noteCard ?? {}
          const id = toCleanString(entry?.id)
          if (!id) continue
          const xsecToken = toCleanString(entry?.xsecToken)
          rows.push({
            id,
            title: toCleanString(card.displayTitle),
            type: toCleanString(card.type),
            author: toCleanString(card.user?.nickname ?? card.user?.nickName),
            likes: toCleanString(card.interactInfo?.likedCount),
            url: buildFeedNoteUrl(id, xsecToken)
          })
        }
        return rows
      }
    })

    // 3. 搜索小红书笔记
    mcp.registerTool({
      name: 'xhs_search_notes',
      title: '搜索小红书笔记',
      description: '在小红书搜索页面获取搜索结果列表。若提供 keyword 且当前不是对应搜索页，会触发页面跳转。',
      inputSchema: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: '搜索关键字，若不提供则直接从当前搜索页面提取结果'
          },
          limit: {
            type: 'number',
            description: '期望获取的搜索结果条数，默认 20，最大 50'
          }
        }
      },
      execute: async ({ keyword, limit = 20 }: { keyword?: string; limit?: number }): Promise<any> => {
        if (keyword) {
          const targetUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_search_result_notes`
          if (location.href !== targetUrl) {
            location.href = targetUrl
            return {
              status: 'redirecting',
              message: `正在跳转到小红书搜索页面 "${keyword}"，请在页面跳转并加载完毕后重新运行此工具。`
            }
          }
        }

        if (!location.href.includes('xiaohongshu.com/search_result')) {
          throw new Error('当前不在小红书搜索结果页，请指定 keyword 参数，或先访问 https://www.xiaohongshu.com/search_result')
        }

        const isVisibleNote = (el: HTMLElement) => {
          if (el.classList.contains('query-note-item')) return false
          const rect = el.getBoundingClientRect()
          if (rect.width <= 0 || rect.height <= 0) return false
          const style = getComputedStyle(el)
          return style.display !== 'none' && style.visibility !== 'hidden'
        }

        const collectNoteCards = () => {
          const classMatches = document.querySelectorAll('section.note-item')
          if (classMatches.length > 0) return Array.from(classMatches)
          const sections = new Set<Element>()
          for (const a of Array.from(document.querySelectorAll('a[href*="/search_result/"], a[href*="/explore/"]'))) {
            const section = a.closest('section')
            if (section) sections.add(section)
          }
          return Array.from(sections)
        }

        const cleanText = (value: any) => (value || '').replace(/\s+/g, ' ').trim()
        const stripSuffix = (value: string) => {
          const text = (value || '').replace(/\s+/g, ' ').trim()
          return text.replace(/\s*(?:\d{1,2}天前|\d+小时前|\d+分钟前|\d+秒前|刚刚|昨天|前天|\d+周前|\d+个月前|\d{1,2}-\d{1,2}|\d{4}-\d{1,2}-\d{1,2})$/u, '').trim() || text
        }

        const extractData = (): SearchItem[] => {
          const results: SearchItem[] = []
          const seen = new Set()
          const cards = collectNoteCards()

          for (const el of cards) {
            const htmlEl = el as HTMLElement
            if (htmlEl.classList?.contains('query-note-item')) continue
            if (!isVisibleNote(htmlEl)) continue

            const titleEl = el.querySelector('.title, .note-title, a.title, .footer .title span')
            const nameEl = el.querySelector('a.author .name, .author-name, .nick-name, .name')
            const authorWrapEl = el.querySelector('a.author')
            let author = cleanText(nameEl?.textContent || '')
            if (!author && authorWrapEl) {
              const nameChild = authorWrapEl.querySelector('.name')
              author = nameChild ? cleanText(nameChild.textContent || '') : stripSuffix(authorWrapEl.textContent || '')
            }
            const likesEl = el.querySelector('.count, .like-count, .like-wrapper .count')
            const detailLinkEl =
              el.querySelector('a.cover.mask') ||
              el.querySelector('a[href*="/search_result/"]') ||
              el.querySelector('a[href*="/explore/"]') ||
              el.querySelector('a[href*="/note/"]')
            const authorLinkEl = el.querySelector('a.author, a[href*="/user/profile/"]')

            let url = detailLinkEl?.getAttribute('href') || ''
            if (url && !url.startsWith('http')) {
              url = 'https://www.xiaohongshu.com' + url
            }
            if (!url) continue
            if (seen.has(url)) continue
            seen.add(url)

            let title = cleanText(titleEl?.textContent || '')
            if (!title && detailLinkEl) {
              const captionSpan = detailLinkEl.querySelector('span')
              title = cleanText(captionSpan?.textContent || '')
            }

            const noteIdToDate = (urlStr: string) => {
              const match = urlStr.match(/\/(?:search_result|explore|note)\/([0-9a-f]{24})(?=[?#/]|$)/i)
              if (!match) return ''
              const hex = match[1].substring(0, 8)
              const ts = parseInt(hex, 16)
              if (!ts || ts < 1000000000 || ts > 4000000000) return ''
              return new Date((ts + 8 * 3600) * 1000).toISOString().slice(0, 10)
            }

            results.push({
              title,
              author,
              likes: cleanText(likesEl?.textContent || '0'),
              url,
              published_at: noteIdToDate(url),
              author_url: authorLinkEl?.getAttribute('href') ? 'https://www.xiaohongshu.com' + authorLinkEl.getAttribute('href') : ''
            })
          }
          return results
        }

        let currentData = extractData()
        let lastCount = currentData.length
        let plateauRounds = 0

        // 尝试自动滚动 5 次获取更多数据
        for (let i = 0; i < 5; i++) {
          if (currentData.length >= limit) break
          const lastHeight = document.body.scrollHeight
          window.scrollTo(0, lastHeight)
          
          // 等待滚动后的页面渲染
          await new Promise(resolve => setTimeout(resolve, 1500))

          currentData = extractData()
          if (currentData.length === lastCount) {
            plateauRounds++
            if (plateauRounds >= 2) break
          } else {
            plateauRounds = 0
            lastCount = currentData.length
          }
        }

        return currentData.slice(0, limit)
      }
    })


    if (typeof mcp.listTools === 'function') {
      mcp.getTools().then((list: any) => {
        (window as any).__webmcpcli_tools = list
      }).catch(() => {})
    }
    console.log('[webmcp-tools] xiaohongshu.com 专属工具注册成功')
  } catch (e: any) {
    console.error('[webmcp-tools] xiaohongshu.com 注册失败:', e.message)
  }
}
}

initXhsTools()
