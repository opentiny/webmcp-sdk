import CDP from 'chrome-remote-interface'
import { DEBUG_PORT } from './constants.js'

/**
 * 连接 Chrome DevTools Protocol
 */
export async function connectCdp(): Promise<CDP.Client> {
  return CDP({ port: DEBUG_PORT })
}
