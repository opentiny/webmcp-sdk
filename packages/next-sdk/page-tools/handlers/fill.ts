import { inputTextElement } from '@page-agent/page-controller'
import { dispatchComposedEvents, isInShadowDom, waitForDomSettled } from '../utils/dom'
import { REF_ACTION_LABELS, type ActionContext } from '../context'

export async function handleFill(args: any, ctx: ActionContext) {
  const mode = args.responseMode ?? 'diff'
  if (args.index === undefined || typeof args.text !== 'string')
    return ctx.actionError(`${REF_ACTION_LABELS.fill}结果: 缺少元素索引或文本内容`)
  const resolved = await ctx.resolveRefOrError('fill', args.index)
  if (!resolved.ok) return resolved.error
  const el = resolved.el

  let targetEl = el
  if (!(targetEl instanceof HTMLInputElement) && !(targetEl instanceof HTMLTextAreaElement)) {
    // querySelector 不穿透 shadow boundary，对 shadow host 补查其 shadowRoot
    const innerInput =
      el.querySelector('input, textarea') ?? (el.shadowRoot?.querySelector('input, textarea') as HTMLElement | null)
    if (innerInput) {
      targetEl = innerInput as HTMLElement
    }
  }

  if (targetEl instanceof HTMLInputElement && targetEl.readOnly) {
    targetEl.value = args.text
    // composed:true 确保事件穿透 shadow boundary，事件委托框架可捕获
    dispatchComposedEvents(targetEl, 'input', 'change', 'blur')
  } else {
    // 优先尝试标准方式（支持 contenteditable、普通 input/textarea）
    let fillSuccess = false
    try {
      await inputTextElement(targetEl, args.text)
      fillSuccess = true
      if (targetEl instanceof HTMLInputElement || targetEl instanceof HTMLTextAreaElement) {
        // inputTextElement 对 input/textarea 只派发 input 并保持焦点。Knockout 的 value 绑定、Vue 的 v-model.lazy
        // 在 change 时才写回模型，失焦校验在 blur 时才执行；按用户输入后离开输入框的顺序补发 change 再失焦。
        // composed:true 让 shadow DOM 外的监听器也在 blur 之前收到 change。
        targetEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
        targetEl.blur()
      }
    } catch (fillErr) {
      // inputTextElement 失败时（如 Angular/React 组件包装的密码框），
      // 降级使用原生 input value 描述符触发框架变更检测
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        (targetEl instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement).prototype,
        'value'
      )?.set
      if (nativeInputValueSetter && (targetEl instanceof HTMLInputElement || targetEl instanceof HTMLTextAreaElement)) {
        nativeInputValueSetter.call(targetEl, args.text)
        // 发送完整事件序列，触发 Angular ngModel / React 合成事件的变更检测
        targetEl.dispatchEvent(new Event('focus', { bubbles: true, composed: true }))
        targetEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
        targetEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
        targetEl.dispatchEvent(new Event('blur', { bubbles: true, composed: true }))
        fillSuccess = true
      }
    }
    if (!fillSuccess) {
      return ctx.actionError(
        `${REF_ACTION_LABELS.fill}结果: 无法填写元素 ${args.index}，元素不是 input、textarea 或 contenteditable`
      )
    }
    // shadow DOM 内元素：inputTextElement 派发的合成事件 composed:false，
    // 补发 composed:true 事件确保事件委托框架（如 React）能收到。
    // input / textarea 在上方两条路径都已派发 composed 的 change，这里只给 contenteditable 补发。
    if (isInShadowDom(targetEl)) {
      const changeCommitted = targetEl instanceof HTMLInputElement || targetEl instanceof HTMLTextAreaElement
      dispatchComposedEvents(targetEl, 'input', ...(changeCommitted ? [] : ['change']))
    }
  }
  // 等待框架异步插入的校验错误/条件渲染内容稳定后再采集状态
  await waitForDomSettled()
  return ctx.buildBrowserStateResponse(mode)
}
