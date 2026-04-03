/**
 * 判断当前是否处于有效的浏览器环境
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined'
}

/**
 * 判断当前是否处于有效且能访问 document 的浏览器环境
 */
export const isDomAvailable = (): boolean => {
  return isBrowser() && typeof document !== 'undefined'
}
