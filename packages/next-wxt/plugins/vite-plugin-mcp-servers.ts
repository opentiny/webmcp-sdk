import { Plugin, build as viteBuild, ResolvedConfig, ViteDevServer } from 'vite'
import { FSWatcher } from 'vite'
import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

/**
 * Vite 插件：编译 mcp-servers 目录下的 TypeScript 文件
 * - 支持多入口独立构建
 * - 输出 IIFE 格式
 * - 支持 Tree-shaking
 * - 开发模式支持 watch 和热更新
 */
export function mcpServersPlugin(): Plugin {
  let config: ResolvedConfig
  let isServeMode = false
  let watcher: FSWatcher | null = null
  let building = false // 防止重复构建

  /**
   * 扫描 mcp-servers 目录，获取所有域名入口
   */
  function scanMcpServerEntries(): string[] {
    const mcpServersDir = path.resolve(config.root, 'mcp-servers')
    const pattern = path.join(mcpServersDir, '*/index.ts').replace(/\\/g, '/')

    try {
      const entries = glob.sync(pattern)
      console.log('[mcp-servers] 扫描到的入口:', entries)

      const domains = entries
        .filter((entry) => {
          // 确保入口文件存在且是真实的文件
          const isValid = fs.existsSync(entry) && fs.statSync(entry).isFile()
          if (!isValid) {
            console.log('[mcp-servers] 跳过无效入口:', entry)
          }
          return isValid
        })
        .map((entry) => {
          const domain = path.basename(path.dirname(entry))
          return domain
        })
        .filter((domain) => {
          // 排除非域名目录（如 types.d.ts）
          const isValid = domain && !domain.includes('.d.ts') && domain !== 'index.ts'
          if (!isValid) {
            console.log('[mcp-servers] 过滤掉非域名目录:', domain)
          }
          return isValid
        })

      console.log('[mcp-servers] 最终域名列表:', domains)
      return domains
    } catch (error) {
      console.error('[mcp-servers] 扫描入口失败:', error)
      return []
    }
  }

  /**
   * 获取输出目录（支持 WXT 的多模式）
   */
  function getOutputDir(): string {
    // 从环境变量或配置中获取 WXT 模式
    const mode = process.env.MODE || process.env.VITE_MODE || 'dev'
    const outDir = config.build.outDir || '.output'

    // 根据 WXT 的输出规则确定目录
    if (mode === 'production' || process.env.NODE_ENV === 'production') {
      return path.resolve(config.root, outDir.replace('chrome-mv3-dev', 'chrome-mv3'))
    }

    return path.resolve(config.root, outDir)
  }

  /**
   * 清理目录，只保留 index.js
   */
  function cleanupOutputDir(outputDir: string): void {
    try {
      if (!fs.existsSync(outputDir)) {
        return
      }

      const files = fs.readdirSync(outputDir)
      for (const file of files) {
        if (file !== 'index.js') {
          const filePath = path.join(outputDir, file)
          const stat = fs.statSync(filePath)

          if (stat.isDirectory()) {
            // 递归删除目录
            fs.rmSync(filePath, { recursive: true, force: true })
          } else {
            // 删除文件
            fs.unlinkSync(filePath)
          }
        }
      }
    } catch (error) {
      console.error(`[mcp-servers] 清理目录失败: ${outputDir}`, error)
    }
  }

  /**
   * 构建单个 mcp-server 入口
   */
  async function buildMcpServer(domain: string): Promise<void> {
    const entryPath = path.resolve(config.root, 'mcp-servers', domain, 'index.ts')
    const outputDir = path.join(getOutputDir(), 'mcp-servers', domain)

    console.log(`[mcp-servers] 正在构建: ${domain}`)

    try {
      // 先清理目标目录中的非 index.js 文件
      cleanupOutputDir(outputDir)

      await viteBuild({
        configFile: false, // 不使用外部配置文件
        root: config.root,
        mode: config.mode,
        logLevel: 'warn',
        build: {
          lib: {
            entry: entryPath,
            formats: ['iife'],
            name: '$next_remoter_mcp_server', // 全局变量名，匹配 mcp-server.js 的调用
            fileName: () => 'index.js'
          },
          outDir: outputDir,
          emptyOutDir: true,
          minify: false, // 不压缩代码
          rollupOptions: {
            treeshake: true, // 启用 Tree-shaking
            external: ['@opentiny/next-sdk'], // 标记为外部依赖（由 content.ts 注入的 vendor/next-sdk.js 提供）
            output: {
              format: 'iife',
              globals: {
                // vendor/next-sdk.js 以 UMD 格式编译，全局变量名为 WebMCP
                // 见 vite.config.webMcpFull.ts: name: 'WebMCP'
                '@opentiny/next-sdk': 'WebMCP'
              }
            }
          }
        }
      })

      console.log(`[mcp-servers] ✓ 构建完成: ${domain}`)

      // 构建完成后再次清理，确保只保留 index.js
      cleanupOutputDir(outputDir)
    } catch (error) {
      console.error(`[mcp-servers] ✗ 构建失败: ${domain}`, error)
      throw error
    }
  }

  /**
   * 清理 mcp-servers 根目录，确保只保留域名文件夹和 index.js
   */
  function cleanupMcpServersRoot(): void {
    try {
      const mcpServersOutputDir = path.join(getOutputDir(), 'mcp-servers')

      if (!fs.existsSync(mcpServersOutputDir)) {
        return
      }

      const entries = fs.readdirSync(mcpServersOutputDir)

      for (const entry of entries) {
        const entryPath = path.join(mcpServersOutputDir, entry)
        const stat = fs.statSync(entryPath)

        if (stat.isDirectory()) {
          // 清理域名目录，只保留 index.js
          cleanupOutputDir(entryPath)
        } else {
          // 删除 mcp-servers 根目录下的任何文件
          fs.unlinkSync(entryPath)
          console.log(`[mcp-servers] 已删除多余文件: ${entry}`)
        }
      }
    } catch (error) {
      console.error('[mcp-servers] 清理根目录失败:', error)
    }
  }

  /**
   * 构建所有 mcp-servers
   */
  async function buildAllMcpServers(): Promise<void> {
    if (building) {
      console.log('[mcp-servers] 构建中，跳过重复请求')
      return
    }

    building = true
    const startTime = Date.now()
    const domains = scanMcpServerEntries()

    if (domains.length === 0) {
      console.log('[mcp-servers] 没有找到需要构建的入口')
      building = false
      return
    }

    console.log(`[mcp-servers] 开始构建 ${domains.length} 个入口...`)

    try {
      // 并行构建所有入口
      await Promise.all(domains.map((domain) => buildMcpServer(domain)))

      const duration = Date.now() - startTime
      console.log(`[mcp-servers] ✓ 全部构建完成，耗时: ${duration}ms`)

      // 清理 mcp-servers 根目录
      cleanupMcpServersRoot()
    } catch (error) {
      console.error('[mcp-servers] 构建过程出错:', error)
    } finally {
      building = false
    }
  }

  /**
   * 启动 watch 模式
   */
  function startWatchMode(): void {
    if (watcher) return

    const chokidar = require('chokidar')
    const mcpServersDir = path.resolve(config.root, 'mcp-servers')

    watcher = chokidar.watch([path.join(mcpServersDir, '**/index.ts'), path.join(mcpServersDir, '**/*.ts')], {
      ignored: [
        path.join(mcpServersDir, 'index.ts'), // 排除工具函数文件
        '**/node_modules/**'
      ],
      ignoreInitial: true,
      persistent: true
    })

    watcher.on('change', async (filePath: string) => {
      console.log(`[mcp-servers] 文件变更: ${path.relative(config.root, filePath)}`)

      // 判断变更的文件属于哪个域名
      const relativePath = path.relative(mcpServersDir, filePath)
      const domain = relativePath.split(path.sep)[0]

      if (domain && domain !== 'index.ts') {
        await buildMcpServer(domain)
      }
    })

    watcher.on('add', async (filePath: string) => {
      console.log(`[mcp-servers] 新增文件: ${path.relative(config.root, filePath)}`)
      const relativePath = path.relative(mcpServersDir, filePath)
      const domain = relativePath.split(path.sep)[0]

      if (domain && domain !== 'index.ts') {
        await buildMcpServer(domain)
      }
    })

    console.log('[mcp-servers] Watch 模式已启动')
  }

  /**
   * 停止 watch 模式
   */
  function stopWatchMode(): void {
    if (watcher) {
      watcher.close()
      watcher = null
      console.log('[mcp-servers] Watch 模式已停止')
    }
  }

  return {
    name: 'vite-plugin-mcp-servers',

    // 保存配置
    configResolved(resolvedConfig: ResolvedConfig) {
      config = resolvedConfig
      isServeMode = config.command === 'serve'
    },

    // 开发模式：在服务器启动后执行（非阻塞）
    configureServer(server: ViteDevServer) {
      // 在服务器启动后异步执行构建和监听
      server.httpServer?.once('listening', () => {
        console.log('[mcp-servers] 开发服务器已启动，开始构建 mcp-servers...')
        buildAllMcpServers()
          .then(() => {
            startWatchMode()
            console.log('[mcp-servers] 构建完成，监听已启动')
          })
          .catch((error) => {
            console.error('[mcp-servers] 构建失败:', error)
          })
      })
    },

    // 生产构建：在构建结束时执行
    async closeBundle() {
      if (!isServeMode) {
        console.log('[mcp-servers] 生产模式：执行构建')
        await buildAllMcpServers()
      }
    },

    // 清理资源
    buildEnd() {
      if (!isServeMode) {
        stopWatchMode()
      }
    }
  }
}
