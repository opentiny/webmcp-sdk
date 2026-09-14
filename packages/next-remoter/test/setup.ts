// 补充测试环境下 document.currentScript 和 script 标签模拟，防止第三方组件（如 vue-mind-map）初始化时读取最后一个 script 出错
if (typeof document !== 'undefined') {
  let script = document.querySelector('script')
  if (!script) {
    script = document.createElement('script')
    script.setAttribute('data-injectcss', 'false')
    document.head.appendChild(script)
  }
  if (!document.currentScript) {
    Object.defineProperty(document, 'currentScript', {
      value: script,
      writable: true,
      configurable: true
    })
  }
}
