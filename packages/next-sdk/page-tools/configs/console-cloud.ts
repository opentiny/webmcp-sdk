/**
 * 云控制台（consoleCloud）专用 PageAgentToolOptions。
 *
 * 控制台基于 Tiny3（ti3-*）+ Angular，大量自定义组件缺少 role / aria-*：
 * - Tab：`.ti3-tab-li` 无 role=tab，选中靠 `.ti3-tab-active`
 * - 下拉：`.ti3-select-dominator-container` / `.selected-label` 无 combobox 语义
 * - 图标按钮：仅有 `cf-uba` / 子节点 `title`，无 aria-label
 * - 服务列表侧栏、区域选择等用 class 表达选中态
 *
 * 书写约定：优先 selector；仅当需要计算样式等复杂判断时再用 match。
 * （roles 的 selector 为自身 matches；states 的 selector 为 closest）
 */

import { defineA11yConfig } from '../a11y/config'
import type { PageAgentToolOptions } from '../tool-config'

/** 云控制台 page-agent-tool 预设配置 */
export const consoleCloudPageAgentToolOptions: PageAgentToolOptions = {
  enableHighlight: false,
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
          '[cf-uba="searchableRegion..open"]',
        ],
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
        ],
      },

      // 服务列表侧栏分类 / 顶栏菜单项
      {
        role: 'menuitem',
        selector: [
          '.components-service-list-left-box-sidebar-visit-panel > li',
          '.modules-menus-menu-item',
          '.components-menu-wrapper-menu-text',
        ],
      },

      // 区域筛选项 / 下拉选项
      {
        role: 'option',
        selector: [
          '.region-selector-item',
          '.modules-searchable-region-project-item-region-item',
          '.modules-searchable-region-region-panel-recent-region-item',
          '.ti3-multiselect-box-cell',
        ],
      },
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
            '.components-search-content-search-select-search-select-selected',
          ],
        },
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
          ],
        },
      ],
      disabled: [{ selector: '.ti3-disabled' }],
      // 展开态：需结合计算样式，选择器表达不了「可见」
      expanded: [
        {
          match: (el) => {
            try {
              if (
                !el.matches(
                  '.modules-layout-module-sidebar-panel, .modules-searchable-region-region-panel, .ti3-dropdown-container',
                )
              ) {
                return false
              }
              const style = window.getComputedStyle(el as HTMLElement)
              return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
            } catch {
              return false
            }
          },
        },
      ],
    },
    // 仅暴露 cf-uba：title/data-qa-id 若放入 exposedAttributes 会被当成白名单属性，
    // 导致 ti-tabs 容器、带 title 的段落等大量非操作节点获得 ref，污染无障碍树
    exposedAttributes: ['cf-uba'],
    whitelist: [
      '.modules-service-list-menu-service-icon-container',
      '.ti3-tabs-text',
      '[cf-uba="cloudShell"]',
      '[cf-uba="messageBox"]',
      '[cf-uba="helpFeedback"]',
      '[cf-uba="globalMessage"]',
      '[cf-uba="rightSidebar..hideBtn"]',
    ],
    blacklist: ['noscript'],
    dialogSelectors: [
      '[class*="ti3-modal"]',
      '[class*="ti3-message-box"]',
      '[class*="drawer"]',
      '.modules-layout-module-sidebar-panel',
    ],
  }),
}

/** 判断当前页面是否应使用云控制台（consoleCloud）预设 */
export function isConsoleCloudHost(
  hostname: string = typeof location !== 'undefined' ? location.hostname : '',
): boolean {
  // 要求 console 前为域名边界（开头或 `.`），避免误匹配 xconsole.huaweicloud.com
  return /(^|\.)console\.huaweicloud\.com$/i.test(hostname)
}
