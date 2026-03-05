/**
 * page-tool-bridge - Web MCP 页面工具桥接模块（框架无关）
 *
 * 解决 Web-MCP 工具动态加载问题：工具定义（mcp-servers/）不直接写业务逻辑，
 * 而是通过 window.postMessage 将调用转发给目标页面，页面处理后返回结果。
 *
 * 核心 API：
 *   - setNavigator(fn)    在应用入口注册导航函数
 *   - withPageTools(server)
 *                         包装 WebMcpServer，让 registerTool 第三个参数
 *                         同时支持原始回调函数和路由配置对象（RouteConfig）
 *   - registerPageTool()  在目标页面激活工具处理器，返回 cleanup 函数
 *
 * 使用方式：
 *   // mcp-servers/index.ts
 *   const server = withPageTools(new WebMcpServer())
 *
 *   // mcp-servers/product-guide/tools.ts
 *   server.registerTool('product-guide', { title, description, inputSchema },
 *     { route: '/comprehensive' }            // ← 路由配置对象，替代回调函数
 *   )
 *   // 或仍然使用普通回调（完全兼容）
 *   server.registerTool('simple-tool', { ... }, async (input) => { ... })
 *
 *   // 目标页面（Vue）
 *   onMounted(() => { cleanup = registerPageTool({ route, handlers }) })
 *   onUnmounted(() => cleanup())
 *
 *   // 目标页面（React）
 *   useEffect(() => registerPageTool({ route, handlers }), [])
 *
 *   // 目标页面（Angular）
 *   export class MyComponent implements OnInit, OnDestroy {
 *     private cleanupPageTool!: () => void
 *     ngOnInit() { this.cleanupPageTool = registerPageTool({ route, handlers }) }
 *     ngOnDestroy() { this.cleanupPageTool() }
 *   }
 *
 * setNavigator 在不同框架中的注册方式：
 *   // Vue（main.ts）
 *   const router = createRouter(...)
 *   app.use(router)
 *   setNavigator((route) => router.push(route))
 *
 *   // React（App.tsx，使用 react-router-dom）
 *   function AppNavigator() {
 *     const navigate = useNavigate()
 *     useEffect(() => { setNavigator((route) => navigate(route)) }, [navigate])
 *     return null
 *   }
 *
 *   // Angular（AppComponent，使用 @angular/router）
 *   export class AppComponent {
 *     constructor(private router: Router) {
 *       setNavigator((route) => this.router.navigateByUrl(route))
 *     }
 *   }
 */
import type { ZodRawShape } from 'zod'
import type { RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import type { WebMcpServer } from './WebMcpServer'
import { randomUUID } from './utils/uuid'

// 消息类型常量，使用命名空间前缀避免冲突
const MSG_TOOL_CALL = 'next-sdk:tool-call'
const MSG_TOOL_RESPONSE = 'next-sdk:tool-response'
const MSG_PAGE_READY = 'next-sdk:page-ready'

// 已激活页面注册表：路由路径 → 是否已挂载
const activePages = new Map<string, boolean>()

// 应用注册的导航函数，由 setNavigator 设置
let _navigator: ((route: string) => void | Promise<void>) | null = null

/**
 * 注册应用的导航函数，通常在应用入口（如 main.ts）调用一次。
 * @param fn 导航函数，接收路由路径并执行跳转（如 router.push）
 */
export function setNavigator(fn: (route: string) => void | Promise<void>) {
  _navigator = fn
}

/**
 * registerTool 第三个参数的路由配置对象类型。
 * 当传入此类型时，工具调用会自动跳转到 route 对应的页面并通过消息通信执行。
 */
export type RouteConfig = {
  /** 目标路由路径，如 '/comprehensive' */
  route: string
  /** 等待页面响应的超时时间（ms），默认 30000 */
  timeout?: number
}

/**
 * PageAwareServer 的 registerTool 配置对象类型，与 WebMcpServer.registerTool 保持一致。
 */
type RegisterToolConfig<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape> = {
  title?: string
  description?: string
  inputSchema?: InputArgs
  outputSchema?: OutputArgs
  annotations?: ToolAnnotations
}

/**
 * 包装 WebMcpServer 后的类型：registerTool 第三个参数额外支持 RouteConfig。
 * 泛型签名与 WebMcpServer.registerTool 对齐，保持完整的类型推导能力。
 * 原有的回调函数写法完全兼容，无需改动。
 */
export type PageAwareServer = Omit<WebMcpServer, 'registerTool'> & {
  registerTool<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape>(
    name: string,
    config: RegisterToolConfig<InputArgs, OutputArgs>,
    // handler 不引入 ToolCallback<InputArgs>：该类型含 MCP SDK 深层泛型，
    // 叠加 ZodRawShape 推断链后会触发"类型实例化过深"。
    // 实际类型安全由 Proxy 内部透传给 WebMcpServer.registerTool 保证。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handlerOrRoute: ((...args: any[]) => any) | RouteConfig
  ): RegisteredTool
}

/**
 * 内部：根据 name/route/timeout 生成转发给页面的 handler 函数。
 * 调用流程：
 * 1. 若目标路由已激活 → 直接 postMessage 发送工具调用
 * 2. 若未激活 → 调用导航函数跳转，等待 page-ready 信号后再发送
 * 3. 页面处理后回传结果，Promise resolve
 */
function buildPageHandler(name: string, route: string, timeout = 30000) {
  return (input: any): Promise<any> => {
    const callId = randomUUID()

    return new Promise<any>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>
      // readyHandler 需在 cleanup 中一并移除，避免导航失败时泄漏监听器
      let readyHandler: ((event: MessageEvent) => void) | undefined

      const cleanup = () => {
        clearTimeout(timer)
        window.removeEventListener('message', responseHandler)
        if (readyHandler) {
          window.removeEventListener('message', readyHandler)
        }
      }

      // 超时兜底，防止页面永远不响应
      timer = setTimeout(() => {
        cleanup()
        reject(new Error(`工具 [${name}] 调用超时 (${timeout}ms)，请检查目标页面是否正确调用了 registerPageTool`))
      }, timeout)

      // 通过 callId 精确匹配响应，避免并发调用互相串扰
      const responseHandler = (event: MessageEvent) => {
        if (event.source === window && event.data?.type === MSG_TOOL_RESPONSE && event.data.callId === callId) {
          cleanup()
          event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.result)
        }
      }
      window.addEventListener('message', responseHandler)

      const sendCall = () => {
        window.postMessage({ type: MSG_TOOL_CALL, callId, toolName: name, route, input }, window.location.origin || '*')
      }

      // 单次发送守卫：readyHandler 与导航后 activePages 补充检查均可触发 sendCall，
      // 用此 flag 确保同一次工具调用只发送一条消息，防止工具被重复执行。
      let callSent = false
      const sendCallOnce = () => {
        if (callSent) return
        callSent = true
        sendCall()
      }

      // 将异步导航逻辑提取为独立 run 函数并用 void 调用，
      // 避免在 Promise executor 中直接使用 async（Biome noAsyncPromiseExecutor 规则）。
      // 导航失败时显式 reject，防止外层 Promise 永远挂起。
      const run = async () => {
        try {
          if (activePages.get(route)) {
            // 页面已激活，直接发送
            sendCallOnce()
            return
          }

          // ⚠️ 必须先注册 readyHandler 再触发导航：
          // 若先导航再注册，极快的导航（同步或微任务）可能导致
          // 目标页面已广播 page-ready 而监听器尚未挂载，从而错过信号。
          readyHandler = (event: MessageEvent) => {
            if (event.source === window && event.data?.type === MSG_PAGE_READY && event.data.route === route) {
              window.removeEventListener('message', readyHandler!)
              sendCallOnce()
            }
          }
          window.addEventListener('message', readyHandler)

          if (_navigator) {
            await _navigator(route)
          }

          // 导航 await 完成后，再次检查 activePages：
          // 若页面在注册监听器与导航之间极短间隙内已激活（极端竞态），
          // message 事件已被 handleMessage 消费但 readyHandler 未执行，
          // 此处补充检查确保不会永久等待。
          // sendCallOnce 保证即使两条路径都触发，消息也只发送一次。
          if (activePages.get(route)) {
            window.removeEventListener('message', readyHandler)
            sendCallOnce()
          }
        } catch (err) {
          // 导航本身抛出异常时，确保 Promise 被 reject 而非永远挂起
          cleanup()
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      }
      void run()
    })
  }
}

/**
 * 包装 WebMcpServer，使 registerTool 第三个参数支持 RouteConfig。
 *
 * - 第三个参数为**回调函数**：与原始 registerTool 完全一致，直接透传
 * - 第三个参数为 **RouteConfig 对象**：自动生成转发 handler，工具调用时
 *   先导航到目标路由，再通过 postMessage 与页面通信
 *
 * @example
 * const server = withPageTools(new WebMcpServer())
 *
 * // 路由模式：第三个参数传路由配置
 * server.registerTool('product-guide', { title, inputSchema }, { route: '/comprehensive' })
 *
 * // 普通模式：第三个参数传回调（兼容原有写法）
 * server.registerTool('simple-tool', { title }, async (input) => ({ content: [...] }))
 */
export function withPageTools(server: WebMcpServer): PageAwareServer {
  return new Proxy(server, {
    get(target, prop, receiver) {
      if (prop === 'registerTool') {
        return (name: string, config: any, handlerOrRoute: ((...args: any[]) => any) | RouteConfig) => {
          // 第三个参数是函数 → 直接透传，行为与原始 registerTool 完全相同
          if (typeof handlerOrRoute === 'function') {
            return target.registerTool(name, config, handlerOrRoute as any)
          }
          // 第三个参数是路由配置对象 → 自动生成转发 handler
          const { route, timeout } = handlerOrRoute
          return target.registerTool(name, config, buildPageHandler(name, route, timeout) as any)
        }
      }
      return Reflect.get(target, prop, receiver)
    }
  }) as unknown as PageAwareServer
}

/**
 * 在目标页面激活工具处理器（框架无关的纯 JS 函数）。
 *
 * 调用后立即：
 * - 将路由注册到 activePages（标记页面已激活）
 * - 添加 message 监听，处理来自 buildPageHandler 的工具调用
 * - 广播 page-ready 信号，通知正在等待导航完成的工具
 *
 * 返回 cleanup 函数，页面销毁时调用。
 *
 * @example
 * // Vue（Composition API）
 * let cleanup: () => void
 * onMounted(() => { cleanup = registerPageTool({ route: '/comprehensive', handlers: { ... } }) })
 * onUnmounted(() => cleanup())
 *
 * // React（Hooks）
 * useEffect(() => registerPageTool({ route: '/comprehensive', handlers: { ... } }), [])
 * // useEffect 直接返回 cleanup 函数，React 会在组件卸载时自动调用
 *
 * // Angular（实现 OnInit / OnDestroy 接口）
 * export class PriceProtectionComponent implements OnInit, OnDestroy {
 *   private cleanupPageTool!: () => void
 *
 *   ngOnInit(): void {
 *     this.cleanupPageTool = registerPageTool({
 *       route: '/price-protection',
 *       handlers: {
 *         'price-protection-query': async ({ status }) => { ... },
 *       }
 *     })
 *   }
 *
 *   ngOnDestroy(): void {
 *     this.cleanupPageTool()
 *   }
 * }
 */
export function registerPageTool(options: {
  /**
   * 工具名 → 处理函数的映射表。
   *
   * 此处 handler 的 input 参数类型保留 any：
   * 若改为 unknown，TypeScript 函数参数逆变规则会导致用户的具名解构写法
   *（如 `async ({ productId }: { productId: string }) => ...`）无法通过类型检查，
   * 破坏现有调用方代码的开发体验。运行时输入由 MCP inputSchema 保证类型安全。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handlers: Record<string, (input: any) => Promise<any>>
}): () => void {
  const { handlers } = options
  // 路由路径由运行时自动取当前页面地址，无需调用方手动传入
  const route = window.location.pathname

  const handleMessage = async (event: MessageEvent) => {
    // 同时校验 route 字段，防止多页面注册同名工具时发生跨路由串扰
    if (
      event.source !== window ||
      event.data?.type !== MSG_TOOL_CALL ||
      event.data?.route !== route ||
      !(event.data.toolName in handlers)
    ) {
      return
    }
    const { callId, toolName, input } = event.data
    try {
      const result = await handlers[toolName](input)
      window.postMessage({ type: MSG_TOOL_RESPONSE, callId, result }, window.location.origin || '*')
    } catch (err) {
      window.postMessage(
        {
          type: MSG_TOOL_RESPONSE,
          callId,
          error: err instanceof Error ? err.message : String(err)
        },
        window.location.origin || '*'
      )
    }
  }

  // 注册页面为已激活状态并广播就绪信号
  activePages.set(route, true)
  window.addEventListener('message', handleMessage)
  window.postMessage({ type: MSG_PAGE_READY, route }, window.location.origin || '*')

  // 返回 cleanup，由各框架在页面销毁时调用
  return () => {
    activePages.delete(route)
    window.removeEventListener('message', handleMessage)
  }
}
