import { promises as fs } from 'fs'
import * as path from 'path'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

type RecorderPayload = {
  hostname: string
  toolCode: string
  origin: string
}

const readBody = (req: IncomingMessage) => {
  return new Promise<string>((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

const injectToolCode = async (indexPath: string, toolCode: string) => {
  try {
    const content = await fs.readFile(indexPath, 'utf-8')
    const insertIndex = content.lastIndexOf('}')
    if (insertIndex === -1) {
      await fs.appendFile(indexPath, `\n${toolCode}\n`, 'utf-8')
      return
    }
    const nextContent = `${content.slice(0, insertIndex)}\n${toolCode}\n${content.slice(insertIndex)}`
    await fs.writeFile(indexPath, nextContent, 'utf-8')
  } catch (error) {
    const template = `export default ({ server, z }) => {\n${toolCode}\n}\n`
    await fs.writeFile(indexPath, template, 'utf-8')
  }
}

const ensureMetaFile = async (metaPath: string, hostname: string, origin: string) => {
  try {
    await fs.access(metaPath)
  } catch {
    const metaContent = `export default {
  name: '${hostname}',
  type: 'contentScriptMcpServer',
  url: '${origin}',
  isAlwaysEnabled: false,
  version: '1.0.0'
}
`
    await fs.writeFile(metaPath, metaContent, 'utf-8')
  }
}

const writeToolFiles = async (root: string, payload: RecorderPayload) => {
  const domainDir = path.resolve(root, 'mcp-servers', payload.hostname)
  const indexPath = path.join(domainDir, 'index.ts')
  const metaPath = path.join(domainDir, 'meta.ts')
  await fs.mkdir(domainDir, { recursive: true })
  await injectToolCode(indexPath, payload.toolCode)
  await ensureMetaFile(metaPath, payload.hostname, payload.origin)
}

const respond = (res: ServerResponse, statusCode: number, message: Record<string, any>) => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.end(JSON.stringify(message))
}

const handleRecorderRequest = async (config: ResolvedConfig, req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.end()
    return
  }

  if (req.method !== 'POST') {
    respond(res, 405, { success: false, message: 'Method Not Allowed' })
    return
  }

  try {
    const rawBody = await readBody(req)
    const payload = JSON.parse(rawBody || '{}') as RecorderPayload
    if (!payload.hostname || !payload.toolCode || !payload.origin) {
      respond(res, 400, { success: false, message: 'hostname/toolCode/origin is required' })
      return
    }
    await writeToolFiles(config.root, payload)
    respond(res, 200, { success: true })
  } catch (error: any) {
    respond(res, 500, { success: false, message: error?.message || 'internal error' })
  }
}

export const codeRecorderPlugin = (): Plugin => {
  let resolvedConfig: ResolvedConfig

  return {
    name: 'next-wxt-code-recorder',
    apply: 'serve',
    configResolved(config) {
      resolvedConfig = config
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/__next-wxt__/code-recorder')) {
          return next()
        }
        await handleRecorderRequest(resolvedConfig, req, res)
      })
    }
  }
}
