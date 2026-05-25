/** Chrome 远程调试端口 */
export const DEBUG_PORT = 9523

/** CDP HTTP 基础地址 */
export const DEBUG_HOST = '127.0.0.1'

export function getDebugVersionUrl(port: number = DEBUG_PORT): string {
  return `http://${DEBUG_HOST}:${port}/json/version`
}

export function getDebugListUrl(port: number = DEBUG_PORT): string {
  return `http://${DEBUG_HOST}:${port}/json/list`
}
