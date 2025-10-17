import { QrCode } from './QrCode'
import { Tooltip } from './tooltips';
import chat from './svgs/chat.svg?url'; 
import scan from './svgs/scan.svg?url'; 
import link from './svgs/link.svg?url'; 
import qrCode from './svgs/qrcode.svg?url'; 

const DEFAULT_REMOTE_URL = 'https://agent.opentiny.design/tiny-robot'
const DEFAULT_QR_CODE_URL = 'https://ai.opentiny.design/next-remoter'

/** 菜单项配置接口 */
interface MenuItemConfig {
  /** 菜单项标识 */
  action: 'qr-code' | 'ai-chat' | 'remote-control' | 'remote-url'
  /** 是否显示该菜单项 */
  show?: boolean
  /** 菜单项文本 */
  text?: string
  /** 菜单文字颜色 */
  active?: boolean
  /** 识别码 */
  know?: boolean  
  /** 菜单项描述 */
  desc?: string
  /** 菜单项提示 */
  tip?: string
  /** 菜单项图标SVG */
  icon?: string
  /** 是否显示复制图标 */
  showCopyIcon?: boolean
}

/**  配置选项接口 */
interface FloatingBlockOptions {
  /** 弹出 AI 对话框的回调函数 */
  onShowAIChat?: () => void

  /** 遥控端页面地址，默认为： https://ai.opentiny.design/next-remoter */
  qrCodeUrl?: string
  /** 被遥控页面的 sessionId, 必填 */
  sessionId: string
  /** 菜单项配置 */
  menuItems?: MenuItemConfig[]
  /** 遥控端页面地址，默认为： https://agent.opentiny.design/tiny-robot */
  remoteUrl?: string
}

// 动作类型
type ActionType = 'qr-code' | 'ai-chat' | 'remote-control' | 'remote-url'

const getDefaultMenuItems = (options: FloatingBlockOptions): MenuItemConfig[] => {
  return [
    {
      action: 'qr-code',
      show: true,
      text: '扫码登录',
      desc: '使用手机遥控页面',
      icon: qrCode
    },
    {
      action: 'ai-chat',
      show: true,
      text: '打开对话框',
      desc: '支持在网页端操作AI',
      icon: chat
    },
    {
      action: 'remote-url',
      show: true,
      text: `遥控器链接`,
      desc: `${options.remoteUrl}`,
      active: true,
      tip: options.remoteUrl,
      showCopyIcon: true,
      icon: link
    },
    {
      action: 'remote-control',
      show: true,
      text: `识别码`,
      desc: `${options.sessionId.slice(-6)}`,
      know: true,
      showCopyIcon: true,
      icon: scan
    },
  ]
}

class FloatingBlock {
  private options: FloatingBlockOptions
  private isExpanded = false
  private floatingBlock!: HTMLDivElement
  private dropdownMenu!: HTMLDivElement
  private menuItems: MenuItemConfig[]

  // 计算 sessionPrefix 属性
  private get sessionPrefix(): string {
    return this.options.qrCodeUrl?.includes('?') ? '&sessionId=' : '?sessionId='
  }

  constructor(options: FloatingBlockOptions) {
    if (!options.sessionId) {
      throw new Error('sessionId is required')
    }

    this.options = {
      ...options,
      qrCodeUrl: options.qrCodeUrl || DEFAULT_QR_CODE_URL,
      remoteUrl: options.remoteUrl || DEFAULT_REMOTE_URL
    }

    // 合并默认菜单项配置和用户配置
    this.menuItems = this.mergeMenuItems(options.menuItems)

    this.init()
  }

  private getImageUrl = (asset: string | undefined): HTMLImageElement | undefined => {
    if (!asset) return;
    const img = new Image();
    img.src = asset;
    return img;
  }

  private renderItem = (): void => {
    this.menuItems
      .filter((item) => item.show !== false) // 过滤掉show为false的菜单项
      .map(
        (item) => {
          const wrapper = document.getElementById(`icon-item-${item.action}`) as HTMLDivElement;
          if (!wrapper) return;
          wrapper.innerHTML = '';
          const img = this.getImageUrl(item.icon);
          if (img) wrapper.appendChild(img);
      }
    );
  }

  /**
   * 合并菜单项配置
   * @param userMenuItems 用户自定义菜单项配置
   * @returns 合并后的菜单项配置
   */
  private mergeMenuItems(userMenuItems?: MenuItemConfig[]): MenuItemConfig[] {
    if (!userMenuItems) {
      return getDefaultMenuItems(this.options)
    }

    return getDefaultMenuItems(this.options).map((defaultItem) => {
      const userItem = userMenuItems.find((item) => item.action === defaultItem.action)
      if (userItem) {
        return {
          ...defaultItem,
          ...userItem,
          // 确保show属性存在，默认为true
          show: userItem.show !== undefined ? userItem.show : defaultItem.show
        }
      }
      return defaultItem
    })
  }

  private init(): void {
    this.createFloatingBlock()
    this.createDropdownMenu()
    this.bindEvents()
    this.addStyles()
  }

  // 创建主浮动块
  private createFloatingBlock(): void {
    this.floatingBlock = document.createElement('div')
    this.floatingBlock.className = 'tiny-remoter-floating-block'
    this.floatingBlock.innerHTML = `
      <div class="tiny-remoter-floating-block__icon">
        <img style="display: block; width: 56px;" src="${DEFAULT_QR_CODE_URL}/svgs/logo-next-no-bg-left.svg" alt="icon" />
      </div>
    `

    document.body.appendChild(this.floatingBlock)
  }

  private readyTips = (el: string): void => {
    const element = document.getElementById(el)
    if (!element) {
      return
    }
    new Tooltip(element, {
      content: '复制',
      placement: 'top',
      trigger: 'hover'
    })
  }

  // 创建下拉菜单
  private createDropdownMenu(): void {
    this.dropdownMenu = document.createElement('div')
    this.dropdownMenu.className = 'tiny-remoter-floating-dropdown'

    // 根据配置动态生成菜单项
    const menuItemsHTML = this.menuItems
      .filter((item) => item.show !== false) // 过滤掉show为false的菜单项
      .map(
        (item) => `
        <div class="tiny-remoter-dropdown-item" data-action="${item.action}">
          <div id="icon-item-${item.action}" class="tiny-remoter-dropdown-item__icon">
          </div>
          <div class="tiny-remoter-dropdown-item__content">
            <div title="${item.tip}">${item.text}</div>
            <div class="tiny-remoter-dropdown-item__desc-wrapper">
              <div class="tiny-remoter-dropdown-item__desc ${item.active ? 'tiny-remoter-dropdown-item__desc--active' : ''} ${item.know ? 'tiny-remoter-dropdown-item__desc--know' : ''}">${item.desc}</div>
              <div>
                ${item.showCopyIcon
                     ? `
                   <div class="tiny-remoter-copy-icon" id="${item.action}" data-action="${item.action}">
                     <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="12.000000" height="12.000000" fill="none">
	                      <defs>
	                      	<filter id="pixso_custom_mask_type_luminance">
	                      		<feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0 " />
	                      	</filter>
	                      </defs>
                      	<mask id="mask_0" width="11.999876" height="11.999876" x="0.000000" y="0.000000" maskUnits="userSpaceOnUse">
                      		<g filter="url(#pixso_custom_mask_type_luminance)">
                      			<g id="mask401_19830">
                      				<path id="蒙版" d="M0 0L11.9999 0L11.9999 11.9999L0 11.9999L0 0ZM2.69992 1.34999L8.09977 1.34999C9.5082 1.34999 10.6498 2.49167 10.6498 3.89998L10.6498 9.2999C10.6498 10.7082 9.5082 11.8499 8.09977 11.8499L2.69992 11.8499C1.29149 11.8499 0.149901 10.7082 0.149901 9.2999L0.149901 3.89998C0.149901 2.49167 1.29149 1.34999 2.69992 1.34999Z" fill="rgb(196,196,196)" fill-rule="evenodd" />
                      			</g>
                      		</g>
                      	</mask>
                      	<rect id="ic_public_copy" width="12.000000" height="12.000000" x="0.000000" y="0.000000" />
                      	<rect id="ic_public_copy-复制/base/ic_public_copy" width="11.999876" height="11.999876" x="0.000000" y="0.000000" fill="rgb(255,255,255)" fill-opacity="0" />
                      	<path id="path1" d="M0.000134537 5.99497C0.000134537 5.05748 -0.00236544 4.11999 0.000134537 3.1825C-0.00236544 2.72751 0.055134 2.27501 0.165133 1.83752C0.41263 0.907526 1.01762 0.355032 1.94761 0.140034C2.41261 0.040035 2.8901 -0.00746449 3.3651 3.54269e-05C5.16258 3.54269e-05 6.96006 3.54269e-05 8.76004 3.54269e-05C9.21254 -0.00246455 9.66503 0.0475349 10.1075 0.155034C11.065 0.387531 11.64 0.995025 11.8575 1.95002C11.9575 2.40001 12.005 2.86001 11.9975 3.3225C11.9975 5.13998 11.9975 6.95746 11.9975 8.77244C12 9.22244 11.95 9.67243 11.845 10.1099C11.61 11.0674 11 11.6374 10.0475 11.8574C9.58003 11.9574 9.10504 12.0049 8.62754 11.9974C6.83756 11.9974 5.04758 11.9974 3.2576 11.9974C2.80011 12.0024 2.34511 11.9499 1.90011 11.8449C0.937625 11.6124 0.360131 11.0024 0.142633 10.0424C0.0301342 9.55494 0.000134537 9.06744 0.000134537 8.57495C0.000134537 7.71495 0.000134537 6.85496 0.000134537 5.99497Z" fill="rgb(255,255,255)" fill-opacity="0" fill-rule="evenodd" />
                      	<circle id="path2" cx="5.99993801" cy="5.99993801" r="5.99993801" fill="rgb(255,255,255)" fill-opacity="0" />
                      	<g id="mask" mask="url(#mask_0)">
                      		<g id="组合 8">
                      			<path id="path" d="M11.1 3.89993L11.1 6.8999C11.1 8.55488 9.75502 9.89737 8.10004 9.89737L5.10007 9.89737C3.44258 9.89737 2.1001 8.55488 2.1001 6.8999L2.1001 3.89993C2.1001 2.24245 3.44258 0.897461 5.10007 0.897461L8.10004 0.897461C9.75502 0.897461 11.1 2.24245 11.1 3.89993Z" fill-rule="nonzero" stroke="rgb(25,25,25)" stroke-linejoin="round" stroke-width="0.749992251" />
                      		</g>
                      	</g>
                      	<path id="path4" d="M2.10008 2.39746L8.10002 2.39746C8.92751 2.39746 9.6 3.06995 9.6 3.89995L9.6 9.89738C9.6 10.7274 8.92751 11.3999 8.10002 11.3999L2.10008 11.3999C1.27009 11.3999 0.600098 10.7274 0.600098 9.89738L0.600098 3.89995C0.600098 3.06995 1.27009 2.39746 2.10008 2.39746Z" fill="rgb(255,255,255)" fill-opacity="0" fill-rule="evenodd" />
                      	<path id="path4" d="M9.6 3.89995L9.6 9.89738C9.6 10.7274 8.92751 11.3999 8.10002 11.3999L2.10008 11.3999C1.27009 11.3999 0.600098 10.7274 0.600098 9.89738L0.600098 3.89995C0.600098 3.06995 1.27009 2.39746 2.10008 2.39746L8.10002 2.39746C8.92751 2.39746 9.6 3.06995 9.6 3.89995Z" fill-rule="nonzero" stroke="rgb(25,25,25)" stroke-linejoin="round" stroke-width="0.749992251" />
                      </svg>
                   </div>
                 `
                     : ''
                }
              </div>
            </div>
          </div>
        </div>
      `
      )
      .join('')

    this.dropdownMenu.innerHTML = menuItemsHTML
    document.body.appendChild(this.dropdownMenu)
    this.renderItem()
    this.readyTips(`remote-control`)
    this.readyTips(`remote-url`)
  }


  private bindEvents(): void {
    // 绑定浮动块点击事件
    this.floatingBlock.addEventListener('click', () => {
      this.toggleDropdown()
    })

    // 绑定菜单项点击事件
    this.dropdownMenu.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement

      // 检查是否点击了复制图标
      const copyIcon = target.closest('.tiny-remoter-copy-icon') as HTMLElement
      if (copyIcon) {
        e.stopPropagation() // 阻止事件冒泡，避免触发菜单项点击
        const action = copyIcon.dataset.action as ActionType
        if (action) {
          this.handleAction(action)
        }
        return
      }

      // 处理普通菜单项点击
      const actionItem = target.closest('.tiny-remoter-dropdown-item') as HTMLElement
      const action = actionItem?.dataset.action as ActionType
      if (action) {
        this.handleAction(action)
      }
    })

    // 点击外部关闭菜单
    document.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement
      if (!this.floatingBlock.contains(target) && !this.dropdownMenu.contains(target)) {
        this.closeDropdown()
      }
    })

    // ESC键关闭菜单
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeDropdown()
      }
    })
  }

  private toggleDropdown(): void {
    if (this.isExpanded) {
      this.closeDropdown()
    } else {
      this.openDropdown()
    }
  }

  private openDropdown(): void {
    this.isExpanded = true
    this.floatingBlock.classList.add('expanded')
    this.dropdownMenu.classList.add('show')
  }

  private closeDropdown(): void {
    this.isExpanded = false
    this.floatingBlock.classList.remove('expanded')
    this.dropdownMenu.classList.remove('show')
  }

  private handleAction(action: ActionType): void {
    switch (action) {
      case 'qr-code':
        this.showQRCode()
        break
      case 'ai-chat':
        this.showAIChat()
        break
      case 'remote-control':
        this.copyRemoteControl()
        break
      case 'remote-url':
        this.copyRemoteURL()
        break
    }
    this.closeDropdown()
  }

  private copyRemoteControl(): void {
    this.copyToClipboard(this.options.sessionId.slice(-6))
  }

  private copyRemoteURL(): void {
    this.copyToClipboard(this.options.remoteUrl + this.sessionPrefix + this.options.sessionId)
  }

  // 实现复制到剪贴板功能
  private async copyToClipboard(text: string): Promise<void> {
    try {
      // 优先使用现代浏览器的 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        this.showCopyFeedback(true)
      } else {
        // 降级方案：使用传统的 document.execCommand
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)

        if (successful) {
          this.showCopyFeedback(true)
        } else {
          this.showCopyFeedback(false)
        }
      }
    } catch (error) {
      console.error('复制失败:', error)
      this.showCopyFeedback(false)
    }
  }

  // 显示复制反馈提示
  private showCopyFeedback(success: boolean): void {
    const message = success ? '复制成功！' : '复制失败，请手动复制'
    const feedback = document.createElement('div')
    feedback.className = `tiny-remoter-copy-feedback ${success ? 'success' : 'error'}`
    feedback.textContent = message

    document.body.appendChild(feedback)

    // 添加显示动画
    setTimeout(() => feedback.classList.add('show'), 10)

    // 3秒后自动移除
    setTimeout(() => {
      feedback.classList.remove('show')
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback)
        }
      }, 300)
    }, 1500)
  }

  // 创建二维码弹窗
  private async showQRCode(): Promise<void> {
    const qrCode = new QrCode((this.options.qrCodeUrl || '') + this.sessionPrefix + this.options.sessionId, {})
    const base64 = await qrCode.toDataURL()
    const modal = this.createModal(
      '扫码前往智能遥控器',
      `
      <div style="text-align: center; padding: 32px;">
        <!-- 二维码容器 - 添加渐变背景和阴影效果 -->
        <div style="
          width: 240px; 
          height: 240px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0 auto 24px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);
          position: relative;
          overflow: hidden;
        ">
          <!-- 装饰性背景元素 -->
          <div style="
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: rotate 20s linear infinite;
          "></div>
          
          <!-- 二维码图片容器 -->
          <div style="
            width: 200px;
            height: 200px;
            background: white;
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            position: relative;
            z-index: 1;
          ">
            <img src="${base64}" alt="二维码" style="
              width: 100%; 
              height: 100%; 
              object-fit: contain;
              border-radius: 8px;
            ">
          </div>
        </div>
        
        <!-- 标题文字 -->
        <h3 style="
          color: #333;
          margin: 0 0 12px 0;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: 0.5px;
        ">扫描二维码</h3>
        
        <!-- 描述文字 -->
        <p style="
          color: #666; 
          margin: 0 auto;
          margin-bottom: 20px;
          font-size: 14px;
          line-height: 1.6;
          max-width: 280px;
        ">请使用手机微信或者浏览器扫描二维码跳转到智能遥控器</p>
        
        <!-- 提示图标和文字 -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #999;
          font-size: 12px;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.7;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
          </svg>
          <span>支持微信、浏览器等多种方式</span>
        </div>
      </div>
    `
    )
    this.showModal(modal)
  }

  // 创建AI对话弹窗--- 暂时调 “用户函数”
  private showAIChat(): void {
    this.options.onShowAIChat?.()
  }

  private createModal(title: string, content: string): HTMLDivElement {
    const modal = document.createElement('div')
    modal.className = 'tiny-remoter-floating-modal'
    modal.innerHTML = `
      <div class="tiny-remoter-modal-overlay"></div>
      <div class="tiny-remoter-modal-content">
        <div class="tiny-remoter-modal-header">
          <h3>${title}</h3>
          <button class="tiny-remoter-modal-close">&times;</button>
        </div>
        <div class="tiny-remoter-modal-body">
          ${content}
        </div>
      </div>
    `

    // 绑定关闭事件
    const closeBtn = modal.querySelector('.tiny-remoter-modal-close') as HTMLButtonElement
    const overlay = modal.querySelector('.tiny-remoter-modal-overlay') as HTMLDivElement

    closeBtn.addEventListener('click', () => this.hideModal(modal))
    overlay.addEventListener('click', () => this.hideModal(modal))

    return modal
  }

  private showModal(modal: HTMLDivElement): void {
    document.body.appendChild(modal)
    // 添加显示动画
    setTimeout(() => modal.classList.add('show'), 10)
  }

  private hideModal(modal: HTMLDivElement): void {
    modal.classList.remove('show')
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal)
      }
    }, 100)
  }

  // 创建样式表
  private addStyles(): void {
    const style = document.createElement('style')
    style.textContent = `
      /* 浮动块样式 */
      .tiny-remoter-floating-block {
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 60px;
        height: 60px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 99;
        overflow: hidden;
        border-radius: 50%;
      }

      .tiny-remoter-floating-block__icon {
        transform: scale(0.8);
        transition: transform 0.3s ease;
      }

       .tiny-remoter-floating-block__icon:hover {
        transform: scale(1.1);
      }

      .tiny-remoter-floating-block.expanded .tiny-remoter-floating-block__icon {
        transform: scale(1.1);
      }

      /* 下拉菜单样式 */
      .tiny-remoter-floating-dropdown {
        position: fixed;
        bottom: 100px;
        right: 30px;
        background: white;
        border-radius: 18px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        padding: 24px 24px 0px 24px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(20px) scale(0.95);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 999;
        min-width: 200px;
        width: 223px;
        height: auto;
      }

      .tiny-remoter-floating-dropdown.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
      }

      .tiny-remoter-dropdown-item {
        display: flex;
        align-items: center;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #333;
        margin-bottom: 24px;
        height: 40px;
      }

      .tiny-remoter-dropdown-item:last-child {
        margin-bottom: 32px;
      }

      .tiny-remoter-dropdown-item > span {
        flex: 1;
        overflow: hidden;
        max-width: 120px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tiny-remoter-dropdown-item__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: #f8f9fa;
        border-radius: 8px;
        color: #667eea;
      }

      .tiny-remoter-dropdown-item__content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        overflow: hidden;
        font-size: 12px;
        margin-left: 16px;
      }

      .tiny-remoter-dropdown-item__desc-wrapper {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .tiny-remoter-dropdown-item__desc {
        color: #808080;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .tiny-remoter-dropdown-item__desc--active {
        color: #1476ff;
      }

      .tiny-remoter-dropdown-item__desc--know {
        color: #191919;
      }

      /* 复制图标样式 */
      .tiny-remoter-copy-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        background: #f0f0f0;
        border-radius: 6px;
        color: #666;
        cursor: pointer;
        transition: all 0.2s ease;
        opacity: 0.7;
        margin-left: auto;
      }

      .tiny-remoter-copy-icon:hover {
        background: #e0e0e0;
        color: #333;
        opacity: 1;
        transform: scale(1.1);
      }

      .tiny-remoter-copy-icon:active {
        transform: scale(0.95);
      }

      /* 弹窗样式 */
      .tiny-remoter-floating-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .tiny-remoter-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .tiny-remoter-modal-content {
        background: white;
        border-radius: 16px;
        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.2);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        transform: scale(0.9) translateY(20px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .tiny-remoter-floating-modal.show .tiny-remoter-modal-overlay {
        opacity: 1;
      }

      .tiny-remoter-floating-modal.show .tiny-remoter-modal-content {
        transform: scale(1) translateY(0);
      }

      .tiny-remoter-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid #f0f0f0;
      }

      .tiny-remoter-modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .tiny-remoter-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
        padding: 0;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .tiny-remoter-modal-close:hover {
        background: #f5f5f5;
        color: #666;
      }

      .tiny-remoter-modal-body {
        padding: 24px;
      }

      /* 二维码弹窗动画 */
      @keyframes rotate {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      /* 响应式设计 */
      @media (max-width: 768px) {
        .tiny-remoter-floating-block {
          bottom: 20px;
          right: 20px;
          width: 56px;
          height: 56px;
        }

        .tiny-remoter-floating-dropdown {
          bottom: 90px;
          right: 20px;
          min-width: 180px;
        }

        .tiny-remoter-modal-content {
          width: 95%;
          margin: 20px;
        }
      }

      /* 复制反馈提示样式 */
      .tiny-remoter-copy-feedback {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        backdrop-filter: blur(4px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }

      .tiny-remoter-copy-feedback.show {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, -50%) scale(1);
      }

      .tiny-remoter-copy-feedback.success {
        background: rgba(34, 197, 94, 0.9);
      }

      .tiny-remoter-copy-feedback.error {
        background: rgba(239, 68, 68, 0.9);
      }

      /* 深色主题支持 */
      @media (prefers-color-scheme: dark) {
        .tiny-remoter-floating-dropdown {
          background: #1a1a1a;
          color: white;
        }

        .tiny-remoter-dropdown-item {
          color: white;
        }


        .tiny-remoter-copy-icon {
          background: #2a2a2a;
          color: #ccc;
        }

        .tiny-remoter-copy-icon:hover {
          background: #3a3a3a;
          color: white;
        }

        .tiny-remoter-modal-content {
          background: #1a1a1a;
          color: white;
        }

        .tiny-remoter-modal-header {
          border-bottom-color: #333;
        }

        .tiny-remoter-modal-header h3 {
          color: white;
        }
      }
    `

    document.head.appendChild(style)
  }

  // 销毁组件
  public destroy(): void {
    if (this.floatingBlock.parentNode) {
      this.floatingBlock.parentNode.removeChild(this.floatingBlock)
    }
    if (this.dropdownMenu.parentNode) {
      this.dropdownMenu.parentNode.removeChild(this.dropdownMenu)
    }
  }
}

// 导出组件
export const createRemoter = (options = {} as FloatingBlockOptions) => {
  return new FloatingBlock(options)
}
