import clipboard from 'clipboardy'

/**
 * 将文本设置到系统剪贴板
 * 使用 clipboardy 包，跨平台统一接口，无需手动处理各系统命令
 */
export async function setClipboard(content: string): Promise<void> {
  try {
    await clipboard.write(content)
  } catch (error: any) {
    throw new Error(`设置剪贴板失败: ${error.message}`)
  }
}
