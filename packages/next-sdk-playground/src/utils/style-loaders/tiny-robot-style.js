// Injects @opentiny/tiny-robot CSS into document head when imported as a module
const href = 'https://cdn.jsdelivr.net/npm/@opentiny/tiny-robot@0.3.1/dist/style.css'
if (!globalThis.__tiny_robot_style_injected__) {
  try {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.setAttribute('data-tiny-robot-style', '1')
    document.head.appendChild(link)
    globalThis.__tiny_robot_style_injected__ = true
  } catch (e) {
    // ignore in non-browser envs
    // eslint-disable-next-line no-console
    console.warn('tiny-robot style loader: failed to inject stylesheet', e)
  }
}

export default {}
