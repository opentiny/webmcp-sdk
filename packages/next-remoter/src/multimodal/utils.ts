/**
 * 多模态消息工具函数
 * 提供文件转base64等基础功能
 */

/**
 * 将文件转换为 base64 DataURL
 * @param file 文件对象
 * @returns Promise<string> base64 DataURL字符串
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 检查文件是否为图片
 * @param file 文件对象
 * @returns boolean
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * 验证文件大小
 * @param file 文件对象
 * @param maxSizeMB 最大大小（MB）
 * @returns boolean
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxBytes
}
