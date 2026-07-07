/**
 * a11y/constants.ts
 *
 * 存放无障碍树依赖的静态常量配置、默认选择器及角色映射表。
 */

// ─── 默认校验错误/警告选择器（ARIA 标准 + 主流 UI 框架） ──────────────────

export const DEFAULT_ERROR_SELECTORS = [
  '[role="alert"]', '[aria-invalid="true"]',
  '.ti3-unifyvalid-error', '.ti3-error', '.ti-error',
  '.lego-text-error', '.lego-error',
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
  '.ti3-warning', '.ti-warning', '.lego-text-warning',
  '.warning-msg', '.warning-text', '.is-warning', '.has-warning',
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
