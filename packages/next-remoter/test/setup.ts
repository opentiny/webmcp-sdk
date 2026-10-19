// 为 jsdom 环境预置一个 script 标签，防止部分老第三方库（如 vue-mind-map iconfont）在读取最后一个 script 时报错
if (typeof document !== 'undefined') {
  if (document.getElementsByTagName('script').length === 0) {
    const s = document.createElement('script')
    document.head.appendChild(s)
  }
}
