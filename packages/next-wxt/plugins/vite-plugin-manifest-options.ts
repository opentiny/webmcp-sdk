import { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { FSWatcher } from 'vite'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Vite 插件：确保 manifest.json 中的 options_ui.open_in_tab 设置为 true
 * - 支持 dev 模式和 build 模式
 * - 监听 manifest.json 文件变化并自动修复
 */
export function manifestOptionsPlugin(): Plugin {
  let config: ResolvedConfig
  let isServeMode = false
  let watcher: FSWatcher | null = null

  /**
   * 获取 manifest.json 的路径
   */
  function getManifestPath(): string {
    const mode = process.env.MODE || process.env.VITE_MODE || 'dev'
    const outDir = config.build.outDir || '.output'
    return path.resolve(config.root, outDir, 'manifest.json')
  }

  /**
   * 修复 manifest.json 中的 options_ui 配置
   */
  function fixManifestOptions(): boolean {
    const manifestPath = getManifestPath()

    if (!fs.existsSync(manifestPath)) {
      return false
    }

    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8')
      const manifest = JSON.parse(manifestContent)

      const needsFix = !manifest.options_ui || manifest.options_ui.open_in_tab !== true

      if (needsFix) {
        manifest.options_ui = {
          page: 'options.html',
          open_in_tab: true
        }

        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
        console.log('[manifest-options] ✓ 已修复 manifest.json 中的 options_ui.open_in_tab')
        return true
      }

      return false
    } catch (error) {
      console.error('[manifest-options] 修复 manifest.json 失败:', error)
      return false
    }
  }

  /**
   * 启动 watch 模式（dev 模式）
   */
  function startWatchMode(): void {
    if (watcher) return

    const chokidar = require('chokidar')
    const manifestPath = getManifestPath()
    const manifestDir = path.dirname(manifestPath)

    // 监听 manifest.json 文件
    watcher = chokidar.watch(manifestPath, {
      ignoreInitial: false,
      persistent: true
    })

    // 此时 watcher 已经被赋值，不会为 null
    watcher!.on('add', () => {
      setTimeout(() => fixManifestOptions(), 100) // 延迟一下确保文件写入完成
    })

    watcher!.on('change', () => {
      setTimeout(() => fixManifestOptions(), 100)
    })

    // 也监听目录，以防 manifest.json 还不存在
    const dirWatcher = chokidar.watch(manifestDir, {
      ignoreInitial: false,
      persistent: true,
      ignored: /node_modules/
    })

    dirWatcher.on('add', (filePath: string) => {
      if (filePath === manifestPath || path.basename(filePath) === 'manifest.json') {
        setTimeout(() => fixManifestOptions(), 100)
      }
    })

    console.log('[manifest-options] Watch 模式已启动，监听 manifest.json 变化')
  }

  /**
   * 停止 watch 模式
   */
  function stopWatchMode(): void {
    if (watcher) {
      watcher.close()
      watcher = null
      console.log('[manifest-options] Watch 模式已停止')
    }
  }

  return {
    name: 'vite-plugin-manifest-options',

    // 保存配置
    configResolved(resolvedConfig: ResolvedConfig) {
      config = resolvedConfig
      isServeMode = config.command === 'serve'
    },

    // 开发模式：在服务器启动后执行
    configureServer(server: ViteDevServer) {
      server.httpServer?.once('listening', () => {
        // 立即尝试修复一次
        setTimeout(() => {
          fixManifestOptions()
          startWatchMode()
        }, 500) // 给 wxt 一些时间生成 manifest.json
      })
    },

    // 生产构建：在构建结束时执行
    async closeBundle() {
      if (!isServeMode) {
        // 等待一下确保 manifest.json 已生成
        await new Promise((resolve) => setTimeout(resolve, 200))
        fixManifestOptions()
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
