import { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { FSWatcher } from 'vite'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

/**
 * Vite 插件：自动构建和更新 vendor/next-sdk.js
 * - 监听 packages/next-sdk 源码变化
 * - 自动执行构建命令
 * - 自动复制构建产物到 public/vendor
 * - 支持开发模式 watch 和生产模式构建
 */
export function vendorSdkPlugin(): Plugin {
  let config: ResolvedConfig
  let isServeMode = false
  let watcher: FSWatcher | null = null
  let building = false
  let buildTimeout: NodeJS.Timeout | null = null

  /**
   * 获取 next-sdk 的根目录
   */
  function getNextSdkRoot(): string {
    return path.resolve(config.root, '../next-sdk')
  }

  /**
   * 获取构建产物路径
   */
  function getBuiltFilePath(): string {
    return path.join(getNextSdkRoot(), 'dist', 'webmcp-full.dev.js')
  }

  /**
   * 获取目标文件路径
   */
  function getTargetFilePath(): string {
    return path.join(config.root, 'public', 'vendor', 'next-sdk.js')
  }

  /**
   * 复制构建产物到 public/vendor
   */
  function copyBuiltFile(): boolean {
    const sourceFile = getBuiltFilePath()
    const targetFile = getTargetFilePath()

    try {
      if (!fs.existsSync(sourceFile)) {
        console.warn(`[vendor-sdk] 源文件不存在: ${sourceFile}`)
        return false
      }

      // 确保目标目录存在
      const targetDir = path.dirname(targetFile)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      // 复制文件
      fs.copyFileSync(sourceFile, targetFile)
      console.log(`[vendor-sdk] ✓ 已复制构建产物到: ${path.relative(config.root, targetFile)}`)
      return true
    } catch (error) {
      console.error('[vendor-sdk] 复制文件失败:', error)
      return false
    }
  }

  /**
   * 构建 next-sdk
   */
  async function buildNextSdk(): Promise<void> {
    if (building) {
      console.log('[vendor-sdk] 构建中，跳过重复请求')
      return
    }

    building = true
    const startTime = Date.now()
    const nextSdkRoot = getNextSdkRoot()

    console.log('[vendor-sdk] 开始构建 next-sdk...')

    try {
      // 根据模式选择构建命令（使用 webMcpFull 配置）
      const buildCmd = isServeMode ? 'build:webMcpFull:dev' : 'build:webMcpFull'

      console.log(`[vendor-sdk] 执行命令: pnpm ${buildCmd}`)

      execSync(`pnpm ${buildCmd}`, {
        cwd: nextSdkRoot,
        stdio: 'inherit'
      })

      const duration = Date.now() - startTime
      console.log(`[vendor-sdk] ✓ 构建完成，耗时: ${duration}ms`)

      // 构建完成后复制文件
      copyBuiltFile()
    } catch (error) {
      console.error('[vendor-sdk] 构建失败:', error)
      throw error
    } finally {
      building = false
    }
  }

  /**
   * 带防抖的构建函数
   */
  function debouncedBuild(): void {
    if (buildTimeout) {
      clearTimeout(buildTimeout)
    }

    buildTimeout = setTimeout(() => {
      buildNextSdk().catch((error) => {
        console.error('[vendor-sdk] 构建过程出错:', error)
      })
    }, 500) // 500ms 防抖
  }

  /**
   * 启动 watch 模式
   */
  function startWatchMode(): void {
    if (watcher) return

    const chokidar = require('chokidar')
    const nextSdkRoot = getNextSdkRoot()

    watcher = chokidar.watch(
      [
        path.join(nextSdkRoot, '**/*.ts'),
        path.join(nextSdkRoot, 'package.json'),
        path.join(nextSdkRoot, 'vite.config.webMcpFull.ts')
      ],
      {
        ignored: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
        ignoreInitial: true,
        persistent: true
      }
    )

    watcher.on('change', (filePath: string) => {
      console.log(`[vendor-sdk] 文件变更: ${path.relative(nextSdkRoot, filePath)}`)
      debouncedBuild()
    })

    watcher.on('add', (filePath: string) => {
      console.log(`[vendor-sdk] 新增文件: ${path.relative(nextSdkRoot, filePath)}`)
      debouncedBuild()
    })

    console.log('[vendor-sdk] Watch 模式已启动，监听 next-sdk 源码变化')
  }

  /**
   * 停止 watch 模式
   */
  function stopWatchMode(): void {
    if (watcher) {
      watcher.close()
      watcher = null
      console.log('[vendor-sdk] Watch 模式已停止')
    }

    if (buildTimeout) {
      clearTimeout(buildTimeout)
      buildTimeout = null
    }
  }

  return {
    name: 'vite-plugin-vendor-sdk',

    // 保存配置
    configResolved(resolvedConfig: ResolvedConfig) {
      config = resolvedConfig
      isServeMode = config.command === 'serve'
    },

    // 开发模式：在服务器启动后执行（非阻塞）
    configureServer(server: ViteDevServer) {
      server.httpServer?.once('listening', () => {
        console.log('[vendor-sdk] 开发服务器已启动，检查 next-sdk 构建状态...')

        const targetFile = getTargetFilePath()
        const sourceFile = getBuiltFilePath()

        // 检查目标文件是否存在
        if (!fs.existsSync(targetFile)) {
          console.log('[vendor-sdk] vendor/next-sdk.js 不存在，执行初始构建...')
          buildNextSdk()
            .then(() => {
              startWatchMode()
            })
            .catch((error) => {
              console.error('[vendor-sdk] 初始构建失败:', error)
            })
        } else if (fs.existsSync(sourceFile)) {
          // 检查源文件是否比目标文件新
          const sourceStats = fs.statSync(sourceFile)
          const targetStats = fs.statSync(targetFile)

          if (sourceStats.mtime > targetStats.mtime) {
            console.log('[vendor-sdk] 检测到更新的构建产物，重新复制...')
            copyBuiltFile()
          } else {
            console.log('[vendor-sdk] vendor/next-sdk.js 已是最新版本')
          }

          startWatchMode()
        } else {
          console.log('[vendor-sdk] 构建产物不存在，执行初始构建...')
          buildNextSdk()
            .then(() => {
              startWatchMode()
            })
            .catch((error) => {
              console.error('[vendor-sdk] 初始构建失败:', error)
            })
        }
      })
    },

    // 生产构建：在构建结束时执行
    async closeBundle() {
      if (!isServeMode) {
        console.log('[vendor-sdk] 生产模式：构建 next-sdk')
        await buildNextSdk()
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
