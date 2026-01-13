#!/usr/bin/env node

/**
 * 构建后脚本：修复所有 manifest.json 中的 options_ui.open_in_tab 配置
 * 扫描 .output 目录下的所有子目录，确保每个 manifest.json 都包含 open_in_tab: true
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// 获取当前脚本所在目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 输出目录路径（相对于脚本位置）
const outputDir = path.resolve(__dirname, '..', '.output')

/**
 * 修复单个 manifest.json 文件
 */
function fixManifestOptions(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    console.log(`[fix-manifest] 文件不存在: ${manifestPath}`)
    return false
  }

  try {
    // 读取 manifest.json
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestContent)

    // 检查是否需要修复
    const needsFix = !manifest.options_ui || manifest.options_ui.open_in_tab !== true

    if (needsFix) {
      // 修复配置
      manifest.options_ui = {
        page: manifest.options_ui?.page || 'options.html',
        open_in_tab: true
      }

      // 写回文件
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      console.log(`[fix-manifest] ✓ 已修复: ${path.relative(outputDir, manifestPath)}`)
      return true
    } else {
      console.log(`[fix-manifest] 无需修复: ${path.relative(outputDir, manifestPath)}`)
      return false
    }
  } catch (error) {
    console.error(`[fix-manifest] ✗ 修复失败 (${manifestPath}):`, error.message)
    return false
  }
}

/**
 * 扫描并修复所有 manifest.json 文件
 */
function fixAllManifestFiles() {
  // 检查输出目录是否存在
  if (!fs.existsSync(outputDir)) {
    console.error(`[fix-manifest] ✗ 输出目录不存在: ${outputDir}`)
    process.exit(1)
  }

  console.log(`[fix-manifest] 开始扫描: ${outputDir}`)

  const manifestPaths = []
  let fixedCount = 0

  try {
    // 读取输出目录下的所有条目
    const entries = fs.readdirSync(outputDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // 检查子目录中是否有 manifest.json
        const manifestPath = path.join(outputDir, entry.name, 'manifest.json')
        if (fs.existsSync(manifestPath)) {
          manifestPaths.push(manifestPath)
        }
      }
    }

    // 也检查根目录下是否有 manifest.json
    const rootManifestPath = path.join(outputDir, 'manifest.json')
    if (fs.existsSync(rootManifestPath)) {
      manifestPaths.push(rootManifestPath)
    }

    // 修复所有找到的 manifest.json
    for (const manifestPath of manifestPaths) {
      if (fixManifestOptions(manifestPath)) {
        fixedCount++
      }
    }

    console.log(`[fix-manifest] 完成！共处理 ${manifestPaths.length} 个文件，修复 ${fixedCount} 个文件`)
  } catch (error) {
    console.error(`[fix-manifest] ✗ 扫描失败:`, error.message)
    process.exit(1)
  }
}

// 执行修复
fixAllManifestFiles()
