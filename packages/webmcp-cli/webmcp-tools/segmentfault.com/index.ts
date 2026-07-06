/**
 * SegmentFault (思否) 文章发布工具
 */

// ============================================================
// 类型定义
// ============================================================

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
  message?: string;
}

interface FullFlowParams {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  type?: 'original' | 'repost' | 'translate';
  scope?: 'personal';
  copyright?: boolean;
  scheduled_time?: string;
}

// ============================================================
// 常量配置
// ============================================================

const CONFIG = {
  autoSaveDelay: 4500,      // 思否自动保存约4秒，留余量
  stepInterval: 150,        // 步骤间最小间隔
  tagSuggestionDelay: 800,  // 标签下拉等待
  elementTimeout: 6000,     // 元素查找超时
};

// ============================================================
// DOM 选择器
// ============================================================

const SELECTORS = {
  howtowrite: {
    indicator: '.howtowrite, [class*="howtowrite"], .sf-write-guide',
    continueBtn: [
      'button:contains("我已知晓")',
      'button:contains("继续撰写")',
      'a:contains("我已知晓")',
      '.howtowrite button',
      '.sf-write-guide button',
      'button.ant-btn-primary'
    ]
  },

  editor: {
    indicator: '.write-page, .article-editor, [class*="write-page"], #write-page, .sf-write',

    titleInput: [
      'input[placeholder*="标题"]',
      'input[placeholder*="请输入文章标题"]',
      'input[name="title"]',
      '.write-title input',
      '.article-title input',
      'input[maxlength="100"]'
    ],

    codeMirror: '.CodeMirror, .cm-editor, .CodeMirror-wrap',
    codeMirrorTextarea: '.CodeMirror textarea',
    markdownTextarea: [
      'textarea[name="content"]',
      'textarea[name="body"]',
      '.editor textarea',
      'textarea[placeholder*="内容"]',
      'textarea[placeholder*="请输入正文"]'
    ],

    articleType: {
      original: [
        'input[value="original"]',
        'input[value="1"]',
        'label:contains("原创") input[type="radio"]',
        '[name="type"][value="original"]'
      ],
      repost: [
        'input[value="repost"]',
        'input[value="2"]',
        'label:contains("转载") input[type="radio"]',
        '[name="type"][value="repost"]'
      ],
      translate: [
        'input[value="translate"]',
        'input[value="3"]',
        'label:contains("翻译") input[type="radio"]',
        '[name="type"][value="translate"]'
      ]
    },

    publishScope: {
      personal: [
        'input[value="personal"]',
        'input[value="0"]',
        'label:contains("个人") input[type="radio"]',
        '[name="scope"][value="personal"]'
      ]
    },

    tagInput: [
      'input[placeholder*="标签"]',
      'input[placeholder*="添加标签"]',
      '.tag-input input',
      '[class*="tag"] input[type="text"]',
      'input[name="tags"]'
    ],
    selectedTags: [
      '.selected-tag',
      '.tag-item.selected',
      '.ant-tag',
      '[class*="tag"][class*="selected"]'
    ],
    tagRemoveBtn: [
      '.tag-remove',
      '.tag-close',
      '.ant-tag-close-icon',
      '[class*="tag"] [class*="remove"]',
      '[class*="tag"] [class*="close"]'
    ],
    tagSuggestions: [
      '.tag-suggestion',
      '.dropdown-item',
      '.ant-select-dropdown .ant-select-item',
      '[class*="suggestion"]'
    ],

    categorySelect: [
      'select[name="category"]',
      'select[name="column"]',
      '.category-select',
      'select[class*="category"]'
    ],

    copyrightToggle: [
      'input[name="copyright"]',
      '[class*="copyright"] input[type="checkbox"]',
      'label:contains("版权") input[type="checkbox"]'
    ],

    scheduledPublish: {
      triggerBtn: [
        'button:contains("定时发布")',
        'button:contains("定时")',
        'label:contains("定时发布")',
        '[class*="scheduled"]',
        '[class*="timing"]'
      ],
      datetimeInput: [
        'input[type="datetime-local"]',
        '[class*="datetime"] input',
        '.ant-picker-input input'
      ],
      confirmBtn: [
        'button:contains("确认")',
        'button:contains("确定")',
        'button:contains("设置")',
        '.ant-picker-ok button'
      ]
    },

    discardDraftBtn: [
      'button:contains("舍弃草稿")',
      'button:contains("放弃草稿")',
      '[class*="discard"]',
      '[class*="abandon"]'
    ],

    publishBtn: [
      'button:contains("发布")',
      'button:contains("发布文章")',
      '.btn-publish',
      '[class*="publish"]',
      'button[type="submit"]'
    ]
  }
};

// ============================================================
// 工具函数
// ============================================================

function findElement(selectors: string | string[]): Element | null {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    try {
      if (sel.includes(':contains(')) {
        const match = sel.match(/^(.+):contains\("(.+)"\)$/);
        if (match) {
          const [, tag, text] = match;
          for (const el of document.querySelectorAll(tag)) {
            if (el.textContent?.includes(text)) return el;
          }
          continue;
        }
      }
      const el = document.querySelector(sel);
      if (el) return el;
    } catch (e) { continue; }
  }
  return null;
}

function findElements(selectors: string | string[]): Element[] {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  const results: Element[] = [];
  for (const sel of list) {
    try {
      if (sel.includes(':contains(')) {
        const match = sel.match(/^(.+):contains\("(.+)"\)$/);
        if (match) {
          const [, tag, text] = match;
          for (const el of document.querySelectorAll(tag)) {
            if (el.textContent?.includes(text)) results.push(el);
          }
          continue;
        }
      }
      results.push(...Array.from(document.querySelectorAll(sel)));
    } catch (e) { continue; }
  }
  return results;
}

function waitForElement(selector: string | string[], timeout = CONFIG.elementTimeout): Promise<Element | null> {
  return new Promise((resolve) => {
    const el = findElement(selector);
    if (el) { resolve(el); return; }
    const observer = new MutationObserver(() => {
      const found = findElement(selector);
      if (found) { observer.disconnect(); resolve(found); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(findElement(selector)); }, timeout);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function getNativeValueSetter(element: HTMLInputElement | HTMLTextAreaElement) {
  const proto = element instanceof HTMLInputElement 
    ? window.HTMLInputElement.prototype 
    : window.HTMLTextAreaElement.prototype;
  return Object.getOwnPropertyDescriptor(proto, 'value')?.set;
}

function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const nativeSetter = getNativeValueSetter(element);
  if (nativeSetter) nativeSetter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

async function simulateInput(element: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
  const nativeSetter = getNativeValueSetter(element);
  element.focus();
  element.click();
  await sleep(30);

  if (nativeSetter) nativeSetter.call(element, '');
  else element.value = '';
  element.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(20);

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (nativeSetter) nativeSetter.call(element, element.value + char);
    else element.value += char;
    element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: char }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
    await sleep(15 + Math.random() * 20);
  }

  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
  const tracker = (element as any)._valueTracker;
  if (tracker) tracker.setValue('');
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

// ============================================================
// CodeMirror 操作
// ============================================================

function getCodeMirrorInstance(): any | null {
  const cm5El = document.querySelector('.CodeMirror') as any;
  if (cm5El?.CodeMirror) return cm5El.CodeMirror;
  if ((window as any).CodeMirror) {
    const editors = document.querySelectorAll('.CodeMirror');
    for (const el of Array.from(editors)) {
      const cm = (el as any).CodeMirror;
      if (cm) return cm;
    }
  }
  const cm6El = document.querySelector('.cm-editor') as any;
  const view = cm6El?.cmView?.view ?? cm6El?.CodeMirror?.view ?? cm6El?.view;
  if (view) return view;
  return null;
}

function setCodeMirrorContent(content: string): boolean {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const cm = getCodeMirrorInstance();
  if (!cm) return false;

  if (cm.setValue) {
    cm.setValue(normalized);
    cm.refresh();
    if (cm.trigger) cm.trigger('change', cm);
    const textarea = document.querySelector('.CodeMirror textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = normalized;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  }

  if (cm.dispatch) {
    cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: normalized } });
    return true;
  }

  return false;
}

function getCodeMirrorContentLength(): number {
  const cm = getCodeMirrorInstance();
  if (!cm) return 0;
  if (cm.getValue) return cm.getValue().length;
  if (cm.state?.doc) return cm.state.doc.length;
  return 0;
}

function getArticleFullContent(): string {
  const cm = getCodeMirrorInstance();
  if (cm?.getValue) return cm.getValue();
  if (cm?.state?.doc) return cm.state.doc.toString();
  const ta = findElement(SELECTORS.editor.markdownTextarea) as HTMLTextAreaElement | null;
  if (ta?.value) return ta.value;
  const rich = document.querySelector('[contenteditable="true"]') as HTMLElement | null;
  return rich?.textContent || '';
}

function decodeBase64Content(content: string): string | null {
  try {
    return decodeURIComponent(escape(atob(content)));
  } catch {
    return null;
  }
}

function clearCodeMirror(): boolean {
  return setCodeMirrorContent('');
}

// ============================================================
// 页面检测
// ============================================================

function detectPageType(): 'login' | 'howtowrite' | 'editor' | 'unknown' {
  const url = window.location.href;
  if (url.includes('/user/login')) return 'login';
  if (url.includes('/howtowrite')) return 'howtowrite';
  if (url.includes('/write')) return 'editor';
  if (findElement(SELECTORS.howtowrite.indicator)) return 'howtowrite';
  if (findElement(SELECTORS.editor.indicator)) return 'editor';
  return 'unknown';
}

async function waitForPageType(expected: string[], timeout = 8000): Promise<string> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const current = detectPageType();
    if (expected.includes(current)) return current;
    await sleep(300);
  }
  return detectPageType();
}

// ============================================================
// 核心 Action
// ============================================================

async function navigateToWrite(): Promise<ToolResult> {
  const pageType = detectPageType();
  if (pageType === 'editor') return { success: true, data: { page_type: 'editor' }, message: '已在编辑器页面' };
  if (pageType === 'login') return { success: false, error: 'NOT_LOGGED_IN', errorCode: 'NOT_LOGGED_IN', message: '请先登录 SegmentFault' };
  if (pageType === 'howtowrite') return { success: true, data: { page_type: 'howtowrite' }, message: '在引导页，需点击继续' };

  // 直接导航到 howtowrite 页面
  window.location.href = 'https://segmentfault.com/howtowrite';
  return { success: true, data: { page_type: 'navigating' }, message: '正在导航到引导页...' };
}

async function clickHowtowriteContinue(): Promise<ToolResult> {
  if (detectPageType() !== 'howtowrite') {
    return { success: false, error: 'NOT_HOWTOWRITE', errorCode: 'NOT_HOWTOWRITE', message: '不在引导页' };
  }

  const btn = findElement(SELECTORS.howtowrite.continueBtn) as HTMLElement;
  if (!btn) return { success: false, error: 'BUTTON_NOT_FOUND', errorCode: 'BUTTON_NOT_FOUND', message: '未找到继续按钮' };

  btn.click();
  // 等待跳转到编辑器，减少等待时间
  const newType = await waitForPageType(['editor'], 6000);

  return {
    success: newType === 'editor',
    data: { page_type: newType },
    message: newType === 'editor' ? '已进入编辑器' : `当前: ${newType}`
  };
}

async function setTitle(title: string): Promise<ToolResult> {
  if (!title?.trim()) return { success: false, error: 'EMPTY', errorCode: 'EMPTY', message: '标题不能为空' };
  if (title.length < 5) return { success: false, error: 'TOO_SHORT', errorCode: 'TOO_SHORT', message: '标题至少5字符' };
  if (title.length > 100) return { success: false, error: 'TOO_LONG', errorCode: 'TOO_LONG', message: '标题最多100字符' };

  const input = await waitForElement(SELECTORS.editor.titleInput, 6000) as HTMLInputElement;
  if (!input) return { success: false, error: 'NOT_FOUND', errorCode: 'NOT_FOUND', message: '未找到标题输入框' };

  await simulateInput(input, title);
  await sleep(100);

  const final = input.value?.trim();
  if (final !== title) {
    setInputValue(input, title);
    await sleep(50);
  }

  if (input.value?.trim() !== title) {
    return { success: false, error: 'SET_FAILED', errorCode: 'SET_FAILED', message: `标题写入失败: "${input.value?.trim()}"` };
  }
  return { success: true, message: `标题已设置` };
}

async function setContent(content: string): Promise<ToolResult> {
  if (!content?.trim()) return { success: false, error: 'EMPTY', errorCode: 'EMPTY', message: '正文不能为空' };

  if (setCodeMirrorContent(content)) {
    await sleep(300);
    return { success: true, message: `正文已设置（CodeMirror，${content.length}字符）` };
  }

  const textarea = await waitForElement(SELECTORS.editor.markdownTextarea, 3000) as HTMLTextAreaElement;
  if (textarea) {
    await simulateInput(textarea, content);
    await sleep(200);
    if (textarea.value?.trim() === content.trim()) {
      return { success: true, message: `正文已设置（textarea，${content.length}字符）` };
    }
  }

  const richEditor = document.querySelector('[contenteditable="true"]') as HTMLElement;
  if (richEditor) {
    richEditor.focus();
    richEditor.innerHTML = `<p>${content.replace(/\n/g, '</p><p>')}</p>`;
    richEditor.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await sleep(200);
    return { success: true, message: `正文已设置（富文本，${content.length}字符）` };
  }

  return { success: false, error: 'EDITOR_NOT_FOUND', errorCode: 'EDITOR_NOT_FOUND', message: '未找到编辑器' };
}

async function setArticleType(type: string = 'original'): Promise<ToolResult> {
  const validTypes = ['original', 'repost', 'translate'];
  if (!validTypes.includes(type)) return { success: false, error: 'INVALID_TYPE', errorCode: 'INVALID_TYPE', message: '类型必须是 original/repost/translate' };

  const selectors = SELECTORS.editor.articleType[type as keyof typeof SELECTORS.editor.articleType];
  const el = findElement(selectors) as HTMLInputElement;
  if (!el) return { success: false, error: 'NOT_FOUND', errorCode: 'NOT_FOUND', message: `未找到类型: ${type}` };

  if (el.checked) return { success: true, message: `文章类型已是: ${type}` };

  const label = el.closest('label') || document.querySelector(`label[for="${el.id}"]`);
  if (label) label.click(); else el.click();
  el.checked = true;
  el.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(100);
  return { success: true, message: `文章类型: ${type}` };
}

async function setPublishScope(scope: string = 'personal'): Promise<ToolResult> {
  if (scope === 'personal') {
    const el = findElement(SELECTORS.editor.publishScope.personal) as HTMLInputElement;
    if (!el) return { success: false, error: 'NOT_FOUND', errorCode: 'NOT_FOUND', message: '未找到个人文章选项' };
    if (el.checked) return { success: true, message: '发布范围已是: 个人文章' };

    const label = el.closest('label') || document.querySelector(`label[for="${el.id}"]`);
    if (label) label.click(); else el.click();
    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(100);
    return { success: true, message: '发布范围: 个人文章' };
  }
  return { success: true, message: `发布范围: ${scope}` };
}

async function addTags(tags: string[] = ['前端', 'AI'], clearExisting = false): Promise<ToolResult> {
  if (!tags?.length) return { success: false, error: 'EMPTY', errorCode: 'EMPTY', message: '标签不能为空' };
  if (tags.length > 5) return { success: false, error: 'TOO_MANY', errorCode: 'TOO_MANY', message: '最多5个标签' };

  const input = await waitForElement(SELECTORS.editor.tagInput, 6000) as HTMLInputElement;
  if (!input) return { success: false, error: 'NOT_FOUND', errorCode: 'NOT_FOUND', message: '未找到标签输入框' };

  if (clearExisting) {
    const existing = findElements(SELECTORS.editor.tagRemoveBtn);
    for (const btn of existing) {
      (btn as HTMLElement).click();
      await sleep(200);
    }
  }

  const added: string[] = [];
  const failed: string[] = [];

  for (const tag of tags) {
    let success = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      input.focus();
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(50);
      await simulateInput(input, tag);
      await sleep(CONFIG.tagSuggestionDelay);

      const suggestions = findElements(SELECTORS.editor.tagSuggestions);
      let clicked = false;
      for (const s of suggestions) {
        const text = s.textContent?.trim() || '';
        if (text === tag || text.includes(tag)) {
          (s as HTMLElement).click(); clicked = true; await sleep(300); break;
        }
      }

      if (!clicked) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
        await sleep(500);
      }

      const currentTags = findElements(SELECTORS.editor.selectedTags)
        .map(el => el.textContent?.trim().replace(/\s*[×x]$/, ''));
      if (currentTags.some(t => t === tag || t?.includes(tag))) { success = true; break; }
      await sleep(300);
    }
    success ? added.push(tag) : failed.push(tag);
    await sleep(150);
  }

  return {
    success: added.length > 0,
    data: { added, failed },
    message: `标签: 成功${added.length}个${failed.length ? `, 失败[${failed.join(', ')}]` : ''}`
  };
}

async function setCategory(category: string): Promise<ToolResult> {
  if (!category?.trim()) return { success: false, error: 'EMPTY', errorCode: 'EMPTY', message: '分类不能为空' };

  const select = await waitForElement(SELECTORS.editor.categorySelect, 4000) as HTMLSelectElement;
  if (!select) return { success: false, error: 'NOT_FOUND', errorCode: 'NOT_FOUND', message: '未找到分类选择器' };

  // 等待选项加载
  let retries = 10;
  while (select.options.length <= 1 && retries-- > 0) await sleep(200);

  const opt = Array.from(select.options).find(o => 
    o.textContent?.includes(category) || o.value.includes(category)
  );

  if (!opt) {
    return { success: false, error: 'NOT_FOUND', errorCode: 'NOT_FOUND', message: `未找到分类: ${category}` };
  }

  select.value = opt.value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  select.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(100);
  return { success: true, message: `分类: ${opt.textContent?.trim()}` };
}

async function setCopyright(enabled: boolean = true): Promise<ToolResult> {
  const el = findElement(SELECTORS.editor.copyrightToggle) as HTMLInputElement;
  if (!el) return { success: false, error: 'NOT_FOUND', errorCode: 'NOT_FOUND', message: '未找到版权开关' };
  if (el.checked === enabled) return { success: true, message: `版权已是: ${enabled ? '开启' : '关闭'}` };

  const label = el.closest('label') || el.parentElement;
  if (label) label.click(); else el.click();
  await sleep(200);
  return { success: true, message: `版权: ${enabled ? '开启' : '关闭'}` };
}

// ============================================================
// 定时发布
// ============================================================

async function setScheduledPublish(scheduledTime?: string): Promise<ToolResult> {
  if (!scheduledTime) return { success: true, message: '未设置定时发布，使用立即发布' };

  const date = new Date(scheduledTime);
  if (isNaN(date.getTime())) return { success: false, error: 'INVALID_TIME', errorCode: 'INVALID_TIME', message: '时间格式错误，请使用 ISO 8601 格式' };

  const now = new Date();
  if (date <= now) return { success: false, error: 'PAST_TIME', errorCode: 'PAST_TIME', message: '定时发布时间必须大于当前时间' };

  const triggerBtn = findElement(SELECTORS.editor.scheduledPublish.triggerBtn) as HTMLElement;
  if (!triggerBtn) return { success: false, error: 'NOT_FOUND', errorCode: 'NOT_FOUND', message: '未找到定时发布选项' };

  triggerBtn.click();
  await sleep(600);

  const datetimeInput = findElement(SELECTORS.editor.scheduledPublish.datetimeInput) as HTMLInputElement;
  if (datetimeInput) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    setInputValue(datetimeInput, localStr);
    await sleep(300);

    const confirmBtn = findElement(SELECTORS.editor.scheduledPublish.confirmBtn) as HTMLElement;
    if (confirmBtn) { confirmBtn.click(); await sleep(300); }
    return { success: true, message: `定时发布已设置: ${scheduledTime}` };
  }

  return { success: false, error: 'NOT_IMPLEMENTED', errorCode: 'NOT_IMPLEMENTED', message: '暂不支持此类型的定时发布 UI' };
}

// ============================================================
// 舍弃草稿
// ============================================================

async function discardDraft(): Promise<ToolResult> {
  const pageType = detectPageType();
  if (pageType !== 'editor') return { success: false, error: 'NOT_EDITOR', errorCode: 'NOT_EDITOR', message: '不在编辑器页面' };

  const discardBtn = findElement(SELECTORS.editor.discardDraftBtn);
  if (discardBtn) {
    (discardBtn as HTMLElement).click();
    await sleep(800);
    const confirmBtn = findElement(['button:contains("确认")', 'button:contains("确定")', '.ant-modal-confirm-btns button:last-child']);
    if (confirmBtn) { (confirmBtn as HTMLElement).click(); await sleep(600); }
    return { success: true, message: '已舍弃草稿' };
  }

  const results: string[] = [];
  const titleInput = findElement(SELECTORS.editor.titleInput) as HTMLInputElement;
  if (titleInput) { setInputValue(titleInput, ''); results.push('标题已清空'); }
  if (clearCodeMirror()) results.push('正文已清空');
  else {
    const textarea = findElement(SELECTORS.editor.markdownTextarea) as HTMLTextAreaElement;
    if (textarea) { setInputValue(textarea, ''); results.push('正文已清空'); }
  }
  const existingTags = findElements(SELECTORS.editor.tagRemoveBtn);
  for (const btn of existingTags) { (btn as HTMLElement).click(); await sleep(150); }
  if (existingTags.length > 0) results.push(`已移除 ${existingTags.length} 个标签`);

  return { success: true, data: { cleared_items: results.length }, message: `草稿已舍弃\n${results.join('\n')}` };
}

// ============================================================
// 掘金风格：获取文章信息 / 一键发布
// ============================================================

async function getArticleInfo(): Promise<ToolResult> {
  const pageType = detectPageType();
  if (pageType !== 'editor') {
    return {
      success: false,
      error: 'NOT_EDITOR',
      errorCode: 'NOT_EDITOR',
      message: `当前不在编辑器页面（${pageType}），请先导航到写文章页面`
    };
  }

  const titleInput = findElement(SELECTORS.editor.titleInput) as HTMLInputElement;
  const title = titleInput?.value?.trim() || '';
  const content = getArticleFullContent();

  const tags = findElements(SELECTORS.editor.selectedTags)
    .map((el) => el.textContent?.trim().replace(/\s*[×x]$/, ''))
    .filter(Boolean);

  const catSelect = findElement(SELECTORS.editor.categorySelect) as HTMLSelectElement;
  const category = catSelect?.options[catSelect.selectedIndex]?.textContent?.trim() || '';

  return {
    success: true,
    data: { title, contentLength: content.length, content, tags, category },
    message: '已获取当前文章标题和正文'
  };
}

async function createArticle(title: string, contentBase64: string): Promise<ToolResult> {
  if (!title?.trim()) {
    return { success: false, error: 'EMPTY', errorCode: 'EMPTY', message: '标题不能为空' };
  }
  const content = decodeBase64Content(contentBase64);
  if (!content) {
    return {
      success: false,
      error: 'INVALID_BASE64',
      errorCode: 'INVALID_BASE64',
      message: 'content 不是有效的 Base64 编码，请使用 @base64file: 引用文件'
    };
  }

  if (detectPageType() !== 'editor') {
    return {
      success: false,
      error: 'NOT_EDITOR',
      errorCode: 'NOT_EDITOR',
      message: '当前不在编辑器页面，请先打开 https://segmentfault.com/write'
    };
  }

  const r1 = await setTitle(title);
  if (!r1.success) return r1;
  const r2 = await setContent(content);
  if (!r2.success) return r2;
  await sleep(CONFIG.autoSaveDelay);

  return {
    success: true,
    data: { title: title.trim(), contentLength: content.length, draft_url: 'https://segmentfault.com/user/draft' },
    message: '文章标题和正文已填写，思否将自动保存草稿'
  };
}

async function publishCurrentDraft(params: {
  category: string;
  tags: string[];
  type?: string;
  copyright?: boolean;
}): Promise<ToolResult> {
  if (!params.category?.trim()) {
    return { success: false, error: 'EMPTY', errorCode: 'EMPTY', message: '参数 category 不能为空' };
  }
  if (!params.tags?.length) {
    return { success: false, error: 'EMPTY', errorCode: 'EMPTY', message: '参数 tags 不能为空，请至少提供一个标签' };
  }
  if (params.tags.length > 5) {
    return { success: false, error: 'TOO_MANY', errorCode: 'TOO_MANY', message: '最多 5 个标签' };
  }

  if (detectPageType() !== 'editor') {
    return {
      success: false,
      error: 'NOT_EDITOR',
      errorCode: 'NOT_EDITOR',
      message: '当前不在编辑器页面，请先 tabs switch 到编辑器标签页'
    };
  }

  await setArticleType(params.type || 'original');
  await setPublishScope('personal');
  await addTags(params.tags, true);
  const catResult = await setCategory(params.category);
  if (!catResult.success) return catResult;
  await setCopyright(params.copyright !== false);
  await sleep(CONFIG.autoSaveDelay);

  return publish(true);
}

// ============================================================
// 获取状态
// ============================================================

async function getState(): Promise<ToolResult> {
  const pageType = detectPageType();
  if (pageType !== 'editor') {
    return { success: true, data: { page_type: pageType, can_publish: false }, message: `当前页面: ${pageType}` };
  }

  const titleInput = findElement(SELECTORS.editor.titleInput) as HTMLInputElement;
  const title = titleInput?.value?.trim() || '';

  let contentLen = getCodeMirrorContentLength();
  if (contentLen === 0) {
    const ta = findElement(SELECTORS.editor.markdownTextarea) as HTMLTextAreaElement;
    if (ta) contentLen = ta.value?.length || 0;
  }

  const tags = findElements(SELECTORS.editor.selectedTags)
    .map(el => el.textContent?.trim().replace(/\s*[×x]$/, ''))
    .filter(Boolean);

  const catSelect = findElement(SELECTORS.editor.categorySelect) as HTMLSelectElement;
  const category = catSelect?.options[catSelect.selectedIndex]?.textContent?.trim() || '';

  const copyrightEl = findElement(SELECTORS.editor.copyrightToggle) as HTMLInputElement;
  const copyrightEnabled = copyrightEl?.checked ?? true;

  const errors: string[] = [];
  if (title.length < 5) errors.push('标题过短');
  if (title.length > 100) errors.push('标题过长');
  if (contentLen === 0) errors.push('正文为空');
  if (tags.length === 0) errors.push('未添加标签');
  if (!category || category.includes('选择')) errors.push('未选择分类');

  return {
    success: true,
    data: {
      page_type: 'editor',
      title,
      title_valid: title.length >= 5 && title.length <= 100,
      content_length: contentLen,
      content_valid: contentLen > 0,
      tags,
      tags_valid: tags.length > 0 && tags.length <= 5,
      category,
      category_valid: !!category && !category.includes('选择'),
      copyright: copyrightEnabled,
      can_publish: errors.length === 0,
      errors,
      draft_url: 'https://segmentfault.com/user/draft'
    },
    message: errors.length ? `存在 ${errors.length} 个问题: ${errors.join('; ')}` : '状态正常，可发布'
  };
}

// ============================================================
// 发布
// ============================================================

async function publish(confirm: boolean = false): Promise<ToolResult> {
  if (!confirm) {
    return {
      success: false, error: 'NOT_CONFIRMED', errorCode: 'NOT_CONFIRMED',
      message: '请先审核草稿（https://segmentfault.com/user/draft），确认后回复"确认发布"并传入 confirm: true',
      data: { draft_url: 'https://segmentfault.com/user/draft' }
    };
  }

  const state = await getState();
  if (!state.data?.can_publish) {
    return { success: false, error: 'CANNOT_PUBLISH', errorCode: 'CANNOT_PUBLISH', message: `无法发布: ${state.data?.errors?.join(', ')}` };
  }

  const btn = findElement(SELECTORS.editor.publishBtn);
  if (!btn) return { success: false, error: 'NOT_FOUND', errorCode: 'NOT_FOUND', message: '未找到发布按钮' };

  (btn as HTMLElement).click();
  await sleep(2500);

  const url = window.location.href;
  if (url.includes('/a/')) {
    return { success: true, data: { url, article_id: url.match(/\/a\/(\d+)/)?.[1] }, message: `发布成功: ${url}` };
  }

  const confirmBtn = findElement(['button:contains("确认")', 'button:contains("确定")', '.ant-modal-confirm-btns button:last-child']);
  if (confirmBtn) {
    (confirmBtn as HTMLElement).click();
    await sleep(1500);
    const finalUrl = window.location.href;
    if (finalUrl.includes('/a/')) {
      return { success: true, data: { url: finalUrl, article_id: finalUrl.match(/\/a\/(\d+)/)?.[1] }, message: `发布成功: ${finalUrl}` };
    }
  }

  return { success: true, message: '发布请求已提交' };
}

// ============================================================
// 一键写入
// ============================================================

async function writeArticle(params: {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  type?: string;
  scope?: string;
  copyright?: boolean;
}): Promise<ToolResult> {
  const results: string[] = [];

  const r1 = await setTitle(params.title);
  if (!r1.success) return r1;
  results.push(r1.message);
  await sleep(150);

  const r2 = await setContent(params.content);
  if (!r2.success) return r2;
  results.push(r2.message);
  await sleep(150);

  const r3 = await setArticleType(params.type || 'original');
  if (r3.success) results.push(r3.message);
  await sleep(100);

  const r4 = await setPublishScope(params.scope || 'personal');
  if (r4.success) results.push(r4.message);
  await sleep(100);

  const r5 = await addTags(params.tags || ['前端', 'AI']);
  results.push(r5.message);
  await sleep(150);

  const r6 = await setCategory(params.category);
  if (!r6.success) return r6;
  results.push(r6.message);
  await sleep(100);

  const r7 = await setCopyright(params.copyright !== false);
  if (r7.success) results.push(r7.message);
  await sleep(100);

  // 等待思否自动保存
  await sleep(CONFIG.autoSaveDelay);

  return {
    success: true,
    data: { steps: results.length, draft_url: 'https://segmentfault.com/user/draft' },
    message: `✅ 文章写入完成！（思否已自动保存草稿）\n${results.join('\n')}\n\n📎 封面图片：请手动上传（如需）\n🔍 请前往草稿箱审核: https://segmentfault.com/user/draft\n✅ 审核通过后回复"确认发布"执行发布`
  };
}

// ============================================================

async function publishFullFlow(params: FullFlowParams): Promise<ToolResult> {
  const results: string[] = [];
  const data: any = { steps_completed: 0, draft_url: 'https://segmentfault.com/user/draft' };

  // === 步骤1：导航到 howtowrite ===
  const pageType = detectPageType();
  if (pageType === 'login') {
    return { success: false, error: 'NOT_LOGGED_IN', errorCode: 'NOT_LOGGED_IN', message: '请先登录 SegmentFault' };
  }

  if (pageType === 'editor') {
    results.push('📍 当前已在编辑器');
  } else if (pageType === 'howtowrite') {
    results.push('📍 当前在引导页');
  } else {
    // 直接导航到 howtowrite
    window.location.href = 'https://segmentfault.com/howtowrite';
    results.push('🚀 已导航到引导页');
    // 等待页面加载
    const arrived = await waitForPageType(['howtowrite', 'editor'], 8000);
    if (arrived === 'unknown') {
      return { success: false, error: 'NAV_TIMEOUT', errorCode: 'NAV_TIMEOUT', message: '页面加载超时' };
    }
    await sleep(1000);
  }

  // === 步骤2：过引导页 ===
  if (detectPageType() === 'howtowrite') {
    const continueResult = await clickHowtowriteContinue();
    if (continueResult.success) {
      results.push('✅ 已通过引导页，进入编辑器');
    } else {
      return { success: false, error: 'GUIDE_FAILED', errorCode: 'GUIDE_FAILED', message: `引导页处理失败: ${continueResult.message}` };
    }
    await sleep(800); // 编辑器初始化时间
  }

  // 确认在编辑器
  if (detectPageType() !== 'editor') {
    return { success: false, error: 'NOT_EDITOR', errorCode: 'NOT_EDITOR', message: '未能进入编辑器页面' };
  }

  // 等待编辑器核心元素就绪（标题输入框 + CodeMirror）
  const titleReady = await waitForElement(SELECTORS.editor.titleInput, 5000);
  if (!titleReady) {
    return { success: false, error: 'EDITOR_NOT_READY', errorCode: 'EDITOR_NOT_READY', message: '编辑器未就绪（标题输入框未找到）' };
  }

  // === 步骤3-4：快速填入标题和正文 ===
  const r1 = await setTitle(params.title);
  if (!r1.success) return r1;
  results.push(`✅ ${r1.message}`);
  await sleep(100);

  const r2 = await setContent(params.content);
  if (!r2.success) return r2;
  results.push(`✅ ${r2.message}`);
  await sleep(100);

  // === 步骤5-9：快速设置其他选项 ===
  const r3 = await setArticleType(params.type || 'original');
  if (r3.success) results.push(`✅ ${r3.message}`);
  await sleep(100);

  const r4 = await setPublishScope(params.scope || 'personal');
  if (r4.success) results.push(`✅ ${r4.message}`);
  await sleep(100);

  const r5 = await addTags(params.tags || ['前端', 'AI']);
  results.push(`✅ ${r5.message}`);
  await sleep(100);

  const r6 = await setCategory(params.category);
  if (!r6.success) return r6;
  results.push(`✅ ${r6.message}`);
  await sleep(100);

  const r7 = await setCopyright(params.copyright !== false);
  if (r7.success) results.push(`✅ ${r7.message}`);
  await sleep(100);

  data.steps_completed = 7;

  // === 步骤10：定时发布 ===
  if (params.scheduled_time) {
    const scheduledResult = await setScheduledPublish(params.scheduled_time);
    if (scheduledResult.success) {
      results.push(`✅ ${scheduledResult.message}`);
      data.scheduled = true;
      data.scheduled_time = params.scheduled_time;
    } else {
      results.push(`⚠️ 定时发布失败: ${scheduledResult.message}`);
      data.scheduled = false;
    }
    await sleep(300);
  } else {
    data.scheduled = false;
    results.push('⏰ 未设置定时发布（立即发布）');
  }

  // === 步骤11：封面提示 ===
  data.cover_upload_needed = true;
  results.push('📎 封面图片：请手动上传（如需）');

  // === 步骤12：等待自动保存 ===
  results.push(`⏳ 等待思否自动保存（${CONFIG.autoSaveDelay}ms）...`);
  await sleep(CONFIG.autoSaveDelay);

  // 最终验证
  const finalState = await getState();
  data.validation = finalState.data;
  data.steps_completed = 10;

  return {
    success: true,
    data,
    message: `✅ 文章写入完成！文章已保存至草稿箱\n\n${results.join('\n')}\n\n🔍 请前往草稿箱审核: https://segmentfault.com/user/draft\n✅ 审核无误后，回复"确认发布"执行正式发布`
  };
}

// ============================================================
// 注册工具
// ============================================================

function registerTool(): void {
  if (typeof navigator === 'undefined' || !(navigator as any).modelContext) {
    console.warn('[SF Tool] navigator.modelContext 不可用');
    return;
  }

  (navigator as any).modelContext.registerTool({
    name: 'segmentfault_publish_article',
    description: 'SegmentFault 文章发布工具 v6 精简快速版。导航到 howtowrite → 快速过引导 → 填入标题正文 → 设置选项 → 保存草稿。',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'publish_full_flow',
            'navigate_to_write',
            'click_howtowrite_continue',
            'write_article',
            'set_title',
            'set_content',
            'set_article_type',
            'set_publish_scope',
            'add_tags',
            'set_category',
            'set_copyright',
            'set_scheduled_publish',
            'discard_draft',
            'get_state',
            'get_article_info',
            'create_article',
            'publish_current_draft',
            'publish'
          ],
          description: '操作类型'
        },
        title: { type: 'string', description: '文章标题，5-100字符' },
        content: { type: 'string', description: '文章正文，支持 Markdown' },
        category: { type: 'string', description: '分类名称，如"前端"' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签数组，默认["前端","AI"]' },
        clear_existing: { type: 'boolean', description: '是否清空已有标签' },
        type: { type: 'string', enum: ['original', 'repost', 'translate'], description: '文章类型，默认原创' },
        scope: { type: 'string', enum: ['personal'], description: '发布范围，默认 personal' },
        copyright: { type: 'boolean', description: '版权开关，默认 true' },
        scheduled_time: { type: 'string', description: '定时发布时间，ISO 8601格式' },
        confirm: { type: 'boolean', description: '发布确认，必须 true' }
      },
      required: ['action']
    },
    execute: async (args: any) => {
      try {
        switch (args.action) {
          case 'publish_full_flow': return await publishFullFlow(args);
          case 'navigate_to_write': return await navigateToWrite();
          case 'click_howtowrite_continue': return await clickHowtowriteContinue();
          case 'write_article': return await writeArticle(args);
          case 'set_title': return await setTitle(args.title);
          case 'set_content': return await setContent(args.content);
          case 'set_article_type': return await setArticleType(args.type);
          case 'set_publish_scope': return await setPublishScope(args.scope);
          case 'add_tags': return await addTags(args.tags, args.clear_existing);
          case 'set_category': return await setCategory(args.category);
          case 'set_copyright': return await setCopyright(args.enabled);
          case 'set_scheduled_publish': return await setScheduledPublish(args.scheduled_time);
          case 'discard_draft': return await discardDraft();
          case 'get_state': return await getState();
          case 'get_article_info': return await getArticleInfo();
          case 'create_article': return await createArticle(args.title, args.content);
          case 'publish_current_draft':
            return await publishCurrentDraft({
              category: args.category,
              tags: args.tags,
              type: args.type,
              copyright: args.copyright
            });
          case 'publish': return await publish(args.confirm);
          default: return { success: false, error: 'UNKNOWN_ACTION', errorCode: 'UNKNOWN_ACTION', message: `未知操作: ${args.action}` };
        }
      } catch (err) {
        console.error('[SF Tool] 执行错误:', err);
        return { success: false, error: 'EXEC_ERROR', errorCode: 'EXEC_ERROR', message: err instanceof Error ? err.message : String(err) };
      }
    }
  });

  console.log('[SF Tool] ✅ 已注册 segmentfault_publish_article v7（掘金风格三件套）');

  // 与掘金对齐的独立工具（create_article / get_article_info / publish_current_draft）
  const sfMcp = (navigator as any).modelContext;
  if (sfMcp?.registerTool && !(window as any).__webmcptools_segmentfault_unified) {
    (window as any).__webmcptools_segmentfault_unified = true;

    sfMcp.registerTool({
      name: 'create_article',
      title: '填写思否文章',
      description: '接收文章标题和正文（Base64），填写到 SegmentFault 编辑器中。须先处于 /write 编辑器页面。',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '文章标题，5-100 字符' },
          content: { type: 'string', description: '正文 Base64 编码，支持 @base64file:' }
        },
        required: ['title', 'content']
      },
      execute: async (args: { title: string; content: string }) => createArticle(args.title, args.content)
    });

    sfMcp.registerTool({
      name: 'get_article_info',
      title: '获取当前思否文章信息',
      description: '获取编辑器中当前文章的标题和正文，供 AI 推断分类与标签。',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => getArticleInfo()
    });

    sfMcp.registerTool({
      name: 'publish_current_draft',
      title: '一键发布当前思否草稿',
      description:
        '自动设置分类、标签并发布。调用前 AI 必须先 get_article_info，智能推断 category 与 tags，切勿盲目使用默认值。',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: '分类，如「前端」「后端」「人工智能」' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: '标签数组，1~5 个，须基于文章内容推断'
          },
          type: { type: 'string', enum: ['original', 'repost', 'translate'], description: '文章类型，默认原创' },
          copyright: { type: 'boolean', description: '版权开关，默认 true' }
        },
        required: ['category', 'tags']
      },
      execute: async (args: {
        category: string;
        tags: string[];
        type?: string;
        copyright?: boolean;
      }) => publishCurrentDraft(args)
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', registerTool);
} else {
  registerTool();
}

export {
  registerTool,
  publishFullFlow,
  writeArticle,
  setTitle,
  setContent,
  setScheduledPublish,
  navigateToWrite,
  discardDraft,
  getState,
  getArticleInfo,
  createArticle,
  publishCurrentDraft
};