import { storage } from '@wxt-dev/storage'
;(function () {
  const STORAGE_KEY = 'local:ai-extension-configs'
  const domainsInput = document.getElementById('domainsInput')
  const form = document.getElementById('configForm')
  const dialog = document.getElementById('configDialog')
  const addBtn = document.getElementById('addConfigBtn')
  const cancelBtn = document.getElementById('cancelBtn')
  const tbody = document.getElementById('configTbody')!

  let configs = []
  let editingIndex = null

  async function loadConfigs() {
    try {
      const data = (await storage.getMeta(STORAGE_KEY)) || { list: [] }
      configs = data.list || []
    } catch (e) {
      configs = []
    }
  }
  async function saveConfigs() {
    await storage.setMeta(STORAGE_KEY, { list: configs })
    chrome.runtime.sendMessage({ type: 'reload-sidepanel' })
  }

  function renderTable() {
    tbody.innerHTML = ''
    configs.forEach((c, idx) => {
      const tr = document.createElement('tr')
      tr.style.borderBottom = '1px solid #eef'
      tr.innerHTML = `
              <td style="padding:8px">${escapeHtml(c.name)}</td>
              <td style="padding:8px">${escapeHtml(c.label)}</td>
              <td style="padding:8px">${escapeHtml(c.description || '')}</td>
              <td style="padding:8px">${Array.isArray(c.requireDomains) ? c.requireDomains.join(',') : '未配置域名'}</td>
              <td style="padding:8px">
                <button data-idx="${idx}" class="btn ghost edit">编辑</button>
                <button data-idx="${idx}" class="btn ghost del">删除</button>
              </td>`
      tbody.appendChild(tr)
    })
  }

  tbody.addEventListener('click', (e: MouseEvent) => {
    const idx = Number(e.currentTarget.getAttribute('data-idx'))
    if (e.target.classList.contains('edit')) {
      openEdit(idx)
    } else if (e.target.classList.contains('del')) {
      configs.splice(idx, 1)
      saveConfigs()
      renderTable()
    }
  })

  function escapeHtml(s) {
    return String(s).replace(/[&<>\"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])
  }

  function openAdd() {
    editingIndex = null
    document.getElementById('name').value = ''
    document.getElementById('label').value = ''
    document.getElementById('prompts').value = ''
    document.getElementById('description').value = ''
    domainsInput.value = ''
    toolsInput.value = ''
    try {
      dialog.showModal()
    } catch (e) {
      dialog.setAttribute('open', '')
    }
  }

  function openEdit(idx) {
    const c = configs[idx]
    editingIndex = idx
    document.getElementById('name').value = c.name || ''
    document.getElementById('label').value = c.label || ''
    document.getElementById('prompts').value = c.prompts || ''
    document.getElementById('description').value = c.description || ''
    domainsInput.value = Array.isArray(c.requireDomains) ? c.requireDomains.join(',') : ''
    toolsInput.value = Array.isArray(c.tools) ? c.tools.join(',') : ''
    try {
      dialog.showModal()
    } catch (e) {
      dialog.setAttribute('open', '')
    }
  }

  function hideForm() {
    try {
      dialog.close()
    } catch (e) {
      dialog.removeAttribute('open')
    }
    editingIndex = null
  }

  addBtn.addEventListener('click', () => openAdd())
  cancelBtn.addEventListener('click', () => hideForm())
  // ensure when dialog is closed by other means we reset state
  dialog.addEventListener('close', () => {
    editingIndex = null
  })

  form.addEventListener('submit', (ev) => {
    ev.preventDefault()
    const name = document.getElementById('name').value.trim()
    const label = document.getElementById('label').value.trim()
    const prompts = document.getElementById('prompts').value
    const description = document.getElementById('description').value.trim()

    if (!/^[A-Za-z]+$/.test(name)) {
      alert('Name 必须只包含英文字母且非空')
      return
    }
    if (!label) {
      alert('Label 不能为空')
      return
    }

    // parse comma separated domains into array (no validation)
    const raw = domainsInput.value || ''
    const requireDomains = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s)

    const tools = (toolsInput.value || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s)

    const config = { name, label, prompts, description, requireDomains, tools }
    if (editingIndex === null) {
      configs.push(config)
    } else {
      configs[editingIndex] = config
    }
    saveConfigs()
    renderTable()
    hideForm()
  })

  async function init() {
    await loadConfigs()
    renderTable()
    hideForm()
  }

  init()
})()
