/**
 * 存储键常量定义
 * 统一管理所有存储相关的 key，避免硬编码
 * Storage key constants
 * Unified management of all storage-related keys to avoid hardcoding
 */

/**
 * 存储键枚举
 * Storage key enumeration
 * 使用 localStorage，不需要特殊前缀
 * Using localStorage, no special prefix needed
 */
export const StorageKeys = {
  /** 选中的模型ID Selected model ID */
  SELECTED_MODEL: 'next-remoter-selected-model',
  /** 生成式UI启用状态 GenUI enabled state */
  GENUI_ENABLED: 'next-remoter-genui-enabled',
  /** 本地工具存储 Local tool storage */
  LOCAL_TOOL_STORAGE: 'local-tool-storage',
  /** MCP Session ID */
  MCP_SESSION_ID: 'mcp-sessionId'
} as const

/**
 * 存储键类型
 * Storage key type
 */
export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys]
