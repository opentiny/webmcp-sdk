/**
 * 模型配置相关类型定义
 * Model configuration type definitions
 */

import type { Component } from 'vue'
import type { ICustomAgentModelProviderLlmConfig } from './type'

/**
 * 统一模型配置接口
 * 基于 ICustomAgentModelProviderLlmConfig，额外添加了 UI 展示相关的字段
 * Unified model configuration interface
 * Based on ICustomAgentModelProviderLlmConfig, with additional UI display fields
 */
export type UnifiedModelConfig = ICustomAgentModelProviderLlmConfig & {
  /** 模型唯一标识 Model unique identifier */
  id: string

  /** 显示名称 Display name */
  label: string

  /** 模型图标组件 Icon component */
  icon?: Component

  /** 是否为默认模型 Is default model */
  isDefault?: boolean

  /** 模型描述（可选）Description (optional) */
  description?: string
}
