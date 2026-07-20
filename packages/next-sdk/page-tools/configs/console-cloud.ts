/**
 * 云控制台（consoleCloud）专用 PageAgentToolOptions。
 *
 * 控制台基于 Tiny3（ti3-*）+ Angular，大量自定义组件缺少 role / aria-*：
 * - Tab：`.ti3-tab-li` 无 role=tab，选中靠 `.ti3-tab-active`
 * - 下拉：`.ti3-select-dominator-container` / `.selected-label` 无 combobox 语义
 * - 图标按钮：仅有 `cf-uba` / 子节点 `title`，无 aria-label
 * - 服务列表侧栏、区域选择等用 class 表达选中态
 * - 校验错误/警告：`.ti3-error` / `.ti3-warning` 等无 aria-invalid 语义
 * - 帮助提示：`tp-helptip` 无 role=button，tooltip 浮层无 role=tooltip
 *
 * 书写约定：优先 selector；仅当需要计算样式等复杂判断时再用 match。
 * （roles 的 selector 为自身 matches；states 的 selector 为 closest）
 */

import { defineA11yConfig } from '../a11y/config'
import type { PageAgentToolOptions } from '../tool-config'

/** 云控制台 page-agent-tool 预设配置 */
export const consoleCloudPageAgentToolOptions: PageAgentToolOptions = {
  enableHighlight: true,
  a11yConfig: defineA11yConfig({
    roles: [
      // Tiny3 Tabs：真正可聚焦/可点击的是内部 .ti3-tabs-text（tabindex=0）
      { role: 'tablist', selector: 'ul.ti3-tabs' },
      { role: 'tab', selector: '.ti3-tabs-text' },
      { role: 'tabpanel', selector: ['ti-tab.ti3-tab-pane', '.ti3-tab-pane'] },

      // 自定义下拉 / 区域选择触发器
      {
        role: 'combobox',
        selector: [
          '.ti3-select-dominator-container',
          '.selected-label',
          '.sort-select',
          '.service-select',
          '.region-select',
          '[cf-uba="searchableRegion..open"]'
        ]
      },

      // 图标型 / 无语义按钮
      {
        role: 'button',
        selector: [
          '.modules-service-list-menu-service-icon-container',
          '.ti3-btn-only-icon-noborder',
          '.ti3-select-dominator-dropdown-btn',
          '.modules-right-sidebar-icon-item-wrapper',
          '.modules-right-sidebar-hide-state-plugin',
          '.components-service-list-container-service-list-input-service-close',
          '.modules-searchable-region-region-panel-close',
          '.modules-searchable-region-region-panel-search-btn',
          '[cf-uba="rightSidebar..hideBtn"]',
          // Tiny3 图标组件：帮助中心固定/全屏/关闭等（ti-icon / tp-icon 无原生 button 语义）
          '.ti-global-help-panel-header-icon',
          'ti-icon[name]',
          'tp-icon[name]',
          // 无 name 的箭头/操作图标（如 latest news 区 common-icon 展开箭头）
          'tp-icon.common-icon',
          'ti-icon.common-icon',
          'ti-icon.ti3-icon-full-screen',
          'ti-icon.ti3-icon-close',
          'tp-icon.ti3-icon-full-screen',
          'tp-icon.ti3-icon-close'
        ]
      },

      // 服务列表侧栏分类 / 顶栏菜单项
      {
        role: 'menuitem',
        selector: [
          '.components-service-list-left-box-sidebar-visit-panel > li',
          '.modules-menus-menu-item',
          '.components-menu-wrapper-menu-text'
        ]
      },

      // 区域筛选项 / 下拉选项
      {
        role: 'option',
        selector: [
          '.region-selector-item',
          '.modules-searchable-region-project-item-region-item',
          '.modules-searchable-region-region-panel-recent-region-item',
          '.ti3-multiselect-box-cell'
        ]
      },
      // 模态弹窗：补齐缺失的 role="dialog"（Tiny3 modal/message-box/drawer/侧栏面板）
      {
        role: 'dialog',
        selector: [
          '[class*="ti3-modal"]',
          '[class*="ti3-message-box"]',
          '[class*="drawer"]',
          '.modules-layout-module-sidebar-panel'
        ]
      },

      // Tiny3 tooltip / 帮助提示：补齐缺失的 role="tooltip"
      {
        role: 'tooltip',
        selector: ['tp-helptip', '[class*="ti3-tooltip"]', '.tp-helptip-content', '.ti3-tooltip', '.ti3-tooltip-popper']
      }
    ],
    states: {
      // 选中态：挂在容器 class 上，用 selector + closest 即可命中内部交互节点
      selected: [
        { selector: 'li.ti3-tab-li.ti3-tab-active' },
        // Tiny3 按钮组（计费模式等）：ti3-active 在 .ti3-btn-item-container 上，不在 button 上
        { selector: '.ti3-btn-item-container.ti3-active' },
        { selector: '.components-service-list-left-box-active' },
        {
          selector: [
            '.modules-searchable-region-project-item-region-item-selected',
            '.components-search-content-search-select-search-select-selected'
          ]
        }
      ],
      hasPopup: [
        {
          selector: [
            '.ti3-select-dominator-container',
            '.selected-label',
            '.sort-select',
            '.service-select',
            '.region-select',
            '[cf-uba="searchableRegion..open"]',
            '[cf-uba="serviceList..open"]',
            '[cf-uba="userinfo"]',
            'tp-helptip'
          ]
        }
      ],
      disabled: [{ selector: '.ti3-disabled' }],
      // Tiny3 / Lego 校验错误
      error: [{ selector: ['.ti3-unifyvalid-error', '.ti3-error', '.ti-error', '.lego-text-error', '.lego-error'] }],
      // Tiny3 / Lego 警告
      warning: [{ selector: ['.ti3-warning', '.ti-warning', '.lego-text-warning'] }],
      // 展开态：需结合计算样式，选择器表达不了「可见」
      expanded: [
        {
          match: (el) => {
            try {
              if (
                !el.matches(
                  '.modules-layout-module-sidebar-panel, .modules-searchable-region-region-panel, .ti3-dropdown-container'
                )
              ) {
                return false
              }
              const style = window.getComputedStyle(el as HTMLElement)
              return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
            } catch {
              return false
            }
          }
        }
      ]
    },
    // exposedAttributes 输出属性 token；带 name 的 ti-icon/tp-icon 可交互性由 roles/whitelist 中 ti-icon[name] 等规则判定。
    exposedAttributes: ['cf-uba', 'data-qa-id', 'name'],
    whitelist: [
      '.modules-service-list-menu-service-icon-container',
      '.ti3-tabs-text',
      'tp-helptip',
      '[cf-uba="cloudShell"]',
      '[cf-uba="messageBox"]',
      '[cf-uba="helpFeedback"]',
      '[cf-uba="globalMessage"]',
      '[cf-uba="rightSidebar..hideBtn"]',
      // 帮助中心等区域的 ti-icon / tp-icon 图标按钮
      '.ti-global-help-panel-header-icon',
      'ti-icon[name]',
      'tp-icon[name]',
      'tp-icon.common-icon',
      'ti-icon.common-icon',
      'ti-icon.ti3-icon-full-screen'
    ],
    blacklist: [
      'noscript',
      'pan-gu',
      // 忽略 WebMCP 高亮容器
      '#webmcpcli-highlight-container',
      '#page-agent-runtime_simulator-mask',
      // CFUI 忽略几个大区域
      '#J_header',
      '#J_rightSidebar',
      '#cf_service_icon',
      'tp-helptip'
    ]
  })
}

/** 判断当前页面是否应使用云控制台（consoleCloud）预设 */
export function isConsoleCloudHost(
  hostname: string = typeof location !== 'undefined' ? location.hostname : ''
): boolean {
  // 要求 console 前为域名边界（开头或 `.`），避免误匹配 xconsole.huaweicloud.com
  return /(^|\.)console\.huaweicloud\.com$/i.test(hostname)
}
