import { defineConfig, type Plugin } from 'vite'
import dts from 'vite-plugin-dts'
import { isLibExternal, isNodeOnlyPackageId } from './build/lib-external'

/**
 * 将误入浏览器图的 Node 内置 / Node-only 包替换为空模块，
 * 避免以 external 形式泄漏到宿主（Angular 会报 Can't resolve 'http'）。
 */
function stubNodeOnlyForBrowser(): Plugin {
  const stubPrefix = '\0next-sdk-stub-node:'
  return {
    name: 'next-sdk-stub-node-only',
    enforce: 'pre',
    resolveId(id) {
      if (isNodeOnlyPackageId(id)) {
        return stubPrefix + id
      }
      return null
    },
    load(id) {
      if (!id.startsWith(stubPrefix)) return null
      // 空 ESM，防止宿主再去解析 http/fs/express 等
      return 'export default {};\n'
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      stubNodeOnlyForBrowser(),
      dts({
        tsconfigPath: './tsconfig.json',
        outDir: 'dist',
        include: ['**/*.ts'],
        exclude: ['node_modules/**', 'dist/**', 'build/**', '**/*.test.ts', '**/*.spec.ts'],
        rollupTypes: false,
        insertTypesEntry: true
      })
    ],
    resolve: {
      // 优先走 browser / export conditions，避免打进 pkce-challenge / @vercel/oidc 的 Node 入口
      conditions: ['browser', 'import', 'module', 'default'],
      mainFields: ['browser', 'module', 'jsnext:main', 'jsnext', 'main']
    },
    build: {
      // 清理旧 chunk，避免 Angular 等宿主仍解析到带 ai external 的历史产物
      emptyOutDir: true,
      target: 'esnext',
      lib: {
        entry: {
          index: 'index.ts',
          core: 'core.ts'
        },
        name: 'NEXT-SDK',
        formats: ['es'],
        fileName: (_format, entryName) => `${entryName}.js`
      },
      rollupOptions: {
        // 白名单 external：ai / @ai-sdk / MCP / @opentiny/next 打进产物
        external: isLibExternal
      }
    }
  }
})
