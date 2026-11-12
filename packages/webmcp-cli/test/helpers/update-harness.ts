import { ExtensionUpdateService, type ExtensionUpdateServiceOptions } from '../../src/extension-update/service.js'
import { ExtensionUpdateError } from '../../src/extension-update/errors.js'
import {
  createSandbox,
  extensionFiles,
  generateSigningKey,
  sha256Hex,
  signEnvelope,
  startHttpServer,
  writeFiles,
  zipOfFiles,
  type Route
} from './extension-fixture.js'

export const INSTANCE = 'instance-a'

export async function reasonOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
  } catch (err) {
    if (err instanceof ExtensionUpdateError) return err.reason
    throw err
  }
  throw new Error('预期失败，实际成功')
}

/**
 * 已绑定的安装目录（1.4.0）+ 提供安装包的本地 HTTP 服务。
 * `release()` 发布一个新版本并返回签名后的清单，sequence 每次加 1。
 */
export async function createUpdateHarness(serviceOptions: Partial<ExtensionUpdateServiceOptions> = {}) {
  const sandbox = createSandbox()
  const signer = generateSigningKey()
  writeFiles(
    sandbox.installDir,
    extensionFiles({
      version: '1.4.0',
      publicKeys: [signer.publicKey],
      manifest: { permissions: ['storage'], host_permissions: ['https://a.example/*'] }
    })
  )
  const routes: Record<string, Route> = {}
  const server = await startHttpServer(routes)

  const service = new ExtensionUpdateService({
    baseDir: sandbox.baseDir,
    pickDirectory: async () => sandbox.installDir,
    confirm: async () => true,
    ...serviceOptions
  })
  const bound = (await service.handle('extension/bind', {}, INSTANCE)) as { bindingId: string }
  await service.handle('extension/bind_accept', { bindingId: bound.bindingId }, INSTANCE)

  let sequence = 0
  let packageCount = 0

  const versionFiles = (version: string, options: { publicKeys?: string[]; channel?: string; key?: string } = {}) => ({
    ...extensionFiles({
      version,
      publicKeys: options.publicKeys ?? [signer.publicKey],
      channel: options.channel,
      key: options.key,
      manifest: {
        permissions: ['storage', 'notifications'],
        host_permissions: ['https://a.example/*', 'https://b.example/*'],
        content_scripts: [{ matches: ['https://c.example/*'], js: ['content.js'] }]
      }
    }),
    'background.js': `// ${version}`
  })

  const hostPackage = (pkg: Buffer, route: Partial<Route> = {}) => {
    const pathname = `/pkg-${++packageCount}.zip`
    routes[pathname] = { body: pkg, ...route }
    return server.url(pathname)
  }

  const release = (
    options: {
      version?: string
      zip?: Buffer
      payload?: Record<string, unknown>
      signers?: Array<{ publicKey: string; privateKey: any }>
    } = {}
  ) => {
    const version = options.version ?? '1.5.0'
    const pkg = options.zip ?? zipOfFiles(versionFiles(version))
    const payload = {
      schemaVersion: 1,
      channel: 'stable',
      extensionId: 'abcdefghijklmnopabcdefghijklmnop',
      version,
      sequence: ++sequence,
      url: hostPackage(pkg),
      sha256: sha256Hex(pkg),
      size: pkg.length,
      minBrowserVersion: 120,
      releaseNotes: '',
      publishedAt: '2026-11-11T00:00:00Z',
      ...options.payload
    }
    return signEnvelope(payload, options.signers ?? [signer])
  }

  const call = (method: string, params: Record<string, unknown> = {}, instanceId = INSTANCE) =>
    service.handle(method, params, instanceId) as Promise<any>

  return {
    sandbox,
    signer,
    service,
    routes,
    bindingId: bound.bindingId,
    versionFiles,
    hostPackage,
    release,
    call,
    prepare: (envelope: unknown, instanceId = INSTANCE) =>
      call('extension/prepare', { bindingId: bound.bindingId, envelope }, instanceId),
    cleanup: async () => {
      await server.close()
      sandbox.cleanup()
    }
  }
}
