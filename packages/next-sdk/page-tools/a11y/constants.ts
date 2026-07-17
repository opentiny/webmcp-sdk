/**
 * a11y/constants.ts
 *
 * 存放无障碍树依赖的静态常量配置、默认选择器及角色映射表。
 */

// ─── 默认校验错误/警告选择器（ARIA 标准 + 主流 UI 框架） ──────────────────

export const DEFAULT_ERROR_SELECTORS = [
  '[role="alert"]', '[aria-invalid="true"]',
  '.el-form-item__error',
  '.ant-form-item-explain-error',
  '.is-invalid', '.invalid-feedback',
  '.ng-invalid',
  '.error-msg', '.error-message', '.error-text',
  '.field-error', '.form-error',
  '.is-error', '.has-error',
  '.validate-error', '.valid-error',
]

export const DEFAULT_WARNING_SELECTORS = [
  '.warning-msg', '.warning-text', '.is-warning', '.has-warning',
]

/** 模态弹窗默认选择器：ARIA 标准 + 主流 UI 框架（唯一来源，顶层 constants.ts 从此处重新导出） */
export const DEFAULT_DIALOG_SELECTORS = [
  // W3C ARIA 标准
  '[role="dialog"]',
  '[role="alertdialog"]',
  // Element UI / Element Plus
  '[class*="el-dialog"]',
  '[class*="el-message-box"]',
  // Ant Design
  '[class*="ant-modal"]',
  // Bootstrap
  '[class*="modal-content"]',
  // Vuetify
  '[class*="v-dialog"]',
  // Naive UI
  '[class*="n-modal"]',
]

/** 可见 tooltip / 浮层提示默认选择器：ARIA 标准 + 主流 UI 框架（唯一来源，顶层 constants.ts 从此处重新导出） */
export const DEFAULT_TOOLTIP_SELECTORS = [
  // W3C ARIA 标准
  '[role="tooltip"]',
  // Element Plus
  '[class*="el-tooltip-popper"]',
  '[class*="el-popper"]',
  // Ant Design
  '[class*="ant-tooltip"]',
  '[class*="ant-popover"]',
  // Naive UI
  '[class*="n-tooltip"]',
  '[class*="n-popover"]',
  // Vuetify
  '[class*="v-tooltip"]',
  '[class*="v-menu"]',
]

// ─── ARIA 隐式角色静态映射表（覆盖页面 95%+ 的常用标签）───────────────────────

export const TAG_ROLE_MAP: Record<string, string> = {
  a: 'link',
  article: 'article',
  aside: 'complementary',
  button: 'button',
  caption: 'caption',
  cell: 'cell',
  checkbox: 'checkbox',
  code: 'code',
  columnheader: 'columnheader',
  combobox: 'combobox',
  datalist: 'listbox',
  dd: 'definition',
  details: 'group',
  dialog: 'dialog',
  dt: 'term',
  em: 'emphasis',
  fieldset: 'group',
  figure: 'figure',
  footer: 'contentinfo',
  form: 'form',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  header: 'banner',
  hr: 'separator',
  img: 'img',
  input: 'textbox',         // 默认，具体 type 下面会覆盖
  li: 'listitem',
  link: 'link',
  main: 'main',
  mark: 'mark',
  math: 'math',
  menu: 'list',
  menuitem: 'menuitem',
  meter: 'meter',
  nav: 'navigation',
  ol: 'list',
  option: 'option',
  output: 'status',
  p: 'paragraph',
  progress: 'progressbar',
  rowheader: 'rowheader',
  search: 'search',
  section: 'region',
  select: 'listbox',
  strong: 'strong',
  summary: 'button',
  table: 'table',
  tbody: 'rowgroup',
  td: 'cell',
  textarea: 'textbox',
  tfoot: 'rowgroup',
  th: 'columnheader',
  thead: 'rowgroup',
  time: 'time',
  tr: 'row',
  ul: 'list',
}

/**
 * 框架级 role 覆盖规则
 *
 * 当元素没有显式 role 属性时，按 CSS 选择器匹配框架特有 class 模式，
 * 推断出符合 ARIA 语义的 role，使无障碍树能正确识别非标准 UI 组件。
 *
 * 优先级：显式 role 属性 > 框架 role 覆盖 > 标签隐式映射 > generic
 *
 * 注意：框架特有规则（如 Tiny3 Tabs、tp-helptip）应放在各框架预设配置中
 *（如 configs/console-cloud.ts），此处仅保留通用规则。
 */
export interface RoleOverride {
  /** CSS 选择器，匹配则应用该 role */
  selector: string
  /** 覆盖后的 ARIA 角色 */
  role: string
}

export const DEFAULT_ROLE_OVERRIDES: RoleOverride[] = []

// input[type=*] 的角色覆盖
export const INPUT_TYPE_ROLE: Record<string, string> = {
  button: 'button',
  checkbox: 'checkbox',
  color: 'textbox',
  email: 'textbox',
  file: 'textbox',
  image: 'button',
  number: 'spinbutton',
  radio: 'radio',
  range: 'slider',
  reset: 'button',
  search: 'searchbox',
  submit: 'button',
  tel: 'textbox',
  text: 'textbox',
  url: 'textbox',
}
