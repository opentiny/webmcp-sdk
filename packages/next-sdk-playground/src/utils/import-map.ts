import { ImportMap } from '@vue/repl'

interface ImportMapOptions {
  nextSdkVersion: string
  builtinImportMap?: ImportMap
  extraImports?: Record<string, string>
}

export function generateImportMap(options: ImportMapOptions) {
  const { nextSdkVersion, builtinImportMap, extraImports } = options

  const extraImportsMap = Object.entries(extraImports || {})
    .map(([pkg, version]) => {
      return {
        [pkg]: `https://cdn.jsdelivr.net/npm/${pkg}@${version}`
      }
    })
    .reduce((acc, curr) => {
      return { ...acc, ...curr }
    }, {})

  const importMap: ImportMap = {
    imports: {
      ...builtinImportMap?.imports,
      // nextSdk 相关包 - 使用统一版本号
      '@opentiny/next-sdk': `https://cdn.jsdelivr.net/npm/@opentiny/next-sdk@0.1.15/dist/index.min.js`,
      '@opentiny/next-remoter': `https://cdn.jsdelivr.net/npm/@opentiny/next-remoter@0.0.10/dist/next-remoter.es.js`,
      '@opentiny/tiny-robot': `https://cdn.jsdelivr.net/npm/@opentiny/tiny-robot@0.3.1/dist/index.min.js`,
      // map CSS import to a small JS loader so browser won't try to fetch CSS as a JS module
      '@opentiny/tiny-robot/dist/style.css': '/src/utils/style-loaders/tiny-robot-style.js',
      '@opentiny/tiny-robot-svgs': `https://cdn.jsdelivr.net/npm/@opentiny/tiny-robot-svgs@0.3.1/dist/tiny-robot-svgs.min.js`,
      '@opentiny/tiny-robot-kit': `https://cdn.jsdelivr.net/npm/@opentiny/tiny-robot-kit@0.3.1/dist/index.mjs`,
      '@opentiny/next': 'https://cdn.jsdelivr.net/npm/@opentiny/next@0.3.2/index.js',
      '@opentiny/genui-sdk-vue': 'https://cdn.jsdelivr.net/npm/@opentiny/genui-sdk-vue@0.0.1-alpha.0/dist/index.js',

      // TinyVue 相关包
      '@opentiny/vue': 'https://cdn.jsdelivr.net/npm/@opentiny/vue-runtime@3/dist3/tiny-vue-pc.mjs',
      '@opentiny/vue-icon': 'https://cdn.jsdelivr.net/npm/@opentiny/vue-runtime@3/dist3/tiny-vue-icon.mjs',
      '@opentiny/vue-locale': 'https://cdn.jsdelivr.net/npm/@opentiny/vue-runtime@3/dist3/tiny-vue-locale.mjs',
      '@opentiny/vue-common': 'https://cdn.jsdelivr.net/npm/@opentiny/vue-runtime@3/dist3/tiny-vue-common.mjs',

      // 其他常用库
      '@vueuse/core': 'https://cdn.jsdelivr.net/npm/@vueuse/core@13/index.iife.min.js',
      dompurify: 'https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js',
      'markdown-it': 'https://cdn.jsdelivr.net/npm/markdown-it@14/dist/markdown-it.min.js',
      ajv: 'https://cdn.jsdelivr.net/npm/ajv@8/dist/ajv.min.js',
      zod: 'https://cdn.jsdelivr.net/npm/zod@3/lib/index.mjs',
      '@modelcontextprotocol/sdk':
        'https://cdn.jsdelivr.net/npm/@modelcontextprotocol/sdk@1.23.0/dist/esm/server/index.js',
      '@modelcontextprotocol/sdk/server/mcp.js':
        'https://cdn.jsdelivr.net/npm/@modelcontextprotocol/sdk@1.23.0/dist/esm/server/index.js',
      '@modelcontextprotocol/sdk/shared/uriTemplate.js':
        'https://cdn.jsdelivr.net/npm/@modelcontextprotocol/sdk@1.23.0/dist/esm/shared/uriTemplate.js',
      '@modelcontextprotocol/sdk/server/completable.js':
        'https://cdn.jsdelivr.net/npm/@modelcontextprotocol/sdk@1.23.0/dist/esm/server/completable.js',
      '@modelcontextprotocol/sdk/shared/metadataUtils.js':
        'https://cdn.jsdelivr.net/npm/@modelcontextprotocol/sdk@1.23.0/dist/esm/server/metadataUtils.js',
      '@modelcontextprotocol/sdk/inMemory.js':
        'https://cdn.jsdelivr.net/npm/@modelcontextprotocol/sdk@1.23.0/dist/esm/inMemory.js',
      '@modelcontextprotocol/sdk/types.js':
        'https://cdn.jsdelivr.net/npm/@modelcontextprotocol/sdk@1.23.0/dist/esm/types.js',
      '@modelcontextprotocol/sdk/client/index.js':
        'https://cdn.jsdelivr.net/npm/@modelcontextprotocol/sdk@1.23.0/dist/esm/client/index.js',
      '@modelcontextprotocol/sdk/client/sse.js':
        'https://cdn.jsdelivr.net/npm/@modelcontextprotocol/sdk@1.23.0/dist/esm/client/sse.js',
      '@modelcontextprotocol/sdk/client/streamableHttp.js':
        'https://cdn.jsdelivr.net/npm/@modelcontextprotocol/sdk@1.23.0/dist/esm/client/streamableHttp.js',
      '@modelcontextprotocol/sdk/client/websocket.js':
        'https://cdn.jsdelivr.net/npm/@modelcontextprotocol/sdk@1.23.0/dist/esm/client/websocket.js',
      '@ai-sdk/deepseek': 'https://cdn.jsdelivr.net/npm/@ai-sdk/deepseek@1.0.30/index.js',
      '@ai-sdk/openai': 'https://cdn.jsdelivr.net/npm/@ai-sdk/openai@2.0.76/index.js',
      ai: 'https://cdn.jsdelivr.net/npm/ai@4/index.js',
      qrcode: 'https://cdn.jsdelivr.net/npm/qrcode@1/lib/browser.js',
      echarts: 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js',

      ...extraImportsMap
    }
  }
  console.log(222, importMap)

  return importMap
}
