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
      '@opentiny/next-sdk': `https://cdn.jsdelivr.net/npm/@opentiny/next-sdk@${nextSdkVersion}/dist/webmcp-full.es.js`,
      '@opentiny/next-remoter': `https://cdn.jsdelivr.net/npm/@opentiny/next-remoter@0.2/dist/next-remoter-runtime.es.js`,

      // TinyVue 相关包
      '@opentiny/vue': 'https://cdn.jsdelivr.net/npm/@opentiny/vue-runtime@3/dist3/tiny-vue-pc.mjs',
      '@opentiny/vue-icon': 'https://cdn.jsdelivr.net/npm/@opentiny/vue-runtime@3/dist3/tiny-vue-icon.mjs',
      '@opentiny/vue-locale': 'https://cdn.jsdelivr.net/npm/@opentiny/vue-runtime@3/dist3/tiny-vue-locale.mjs',
      '@opentiny/vue-common': 'https://cdn.jsdelivr.net/npm/@opentiny/vue-runtime@3/dist3/tiny-vue-common.mjs',

      // 其他常用库
      '@vueuse/core': 'https://cdn.jsdelivr.net/npm/@vueuse/core@13/index.iife.min.js',
      '@vue/compiler-sfc': 'https://cdn.jsdelivr.net/npm/@vue/compiler-sfc@latest/dist/compiler-sfc.esm-browser.js',
      dompurify: 'https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js',
      'markdown-it': 'https://cdn.jsdelivr.net/npm/markdown-it@14/dist/markdown-it.min.js',
      qrcode: 'https://cdn.jsdelivr.net/npm/qrcode@1/lib/browser.js',
      echarts: 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js',
      ...extraImportsMap
    }
  }

  return importMap
}
