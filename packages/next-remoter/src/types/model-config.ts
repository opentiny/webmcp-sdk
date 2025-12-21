/**
 * 模型配置相关类型定义
 * Model configuration type definitions
 */

import type { Component } from 'vue'

/**
 * 统一模型配置接口
 * Unified model configuration interface
 */
export interface UnifiedModelConfig {
  /** 模型唯一标识 Model unique identifier */
  id: string

  /** 显示名称 Display name */
  label: string

  /** API 配置 - API Key */
  apiKey: string

  /** API 配置 - Base URL */
  apiUrl: string

  /** 模型提供商类型 Provider type */
  providerType: 'deepseek' | 'openai' | 'openai-compatible'

  /** 模型图标组件 Icon component */
  icon?: Component

  /** 是否为默认模型 Is default model */
  isDefault?: boolean

  /** 模型描述（可选）Description (optional) */
  description?: string
}
