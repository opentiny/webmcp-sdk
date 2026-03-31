export class PromptManager {
  /** 固定系统提示词 */
  private staticPrompt = ''
  /** 元数据提示词 */
  private skillMetaPrompt = ''
  /** 临时系统提示词，比如： get-skill-content的返回值 */
  private tempPrompt = ''

  /** 返回全量的提示词 */
  getSystemPrompt() {
    return `
当前时间：${new Date().toLocaleDateString()}。
${this.staticPrompt}
${this.skillMetaPrompt}
${this.tempPrompt}
`
  }

  /** 设置常驻提示词 */
  setStatic(prompt: string) {
    this.staticPrompt = prompt
  }
  /** 设置技能元数据提示词 */
  setSkillMeta(prompt: string) {
    this.skillMetaPrompt = prompt
  }
  /** 设置临时值， 清除时传入空字符串即可，不再提供clearTemp */
  setTemp(prompt: string) {
    this.tempPrompt = prompt
  }

  /** 累增临时值，为多agent时预留 */
  appendTemp(prompt: string) {
    this.tempPrompt += prompt
  }
}
