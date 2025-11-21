import { ref } from 'vue'
import { metaModules } from '@/mcp-servers'
import { ICustomMarketMcpServers } from '@opentiny/next-remoter'
export const useCustomMarketMcpServers: () => Ref<ICustomMarketMcpServers> = () => {
  const customMarketMcpServers = ref<ICustomMarketMcpServers>([])

  const collectedServers: ICustomMarketMcpServers = []
  for (const module of Object.values(metaModules)) {
    const meta = (module as any).default || module
    if (meta && Array.isArray(meta.customMarketMcpServers)) {
      // 只汇总存在 customMcpServers 字段的 meta（中文注释：过滤无配置的站点）
      collectedServers.push(...meta.customMarketMcpServers)
    }
  }

  customMarketMcpServers.value = collectedServers
  return customMarketMcpServers
}
