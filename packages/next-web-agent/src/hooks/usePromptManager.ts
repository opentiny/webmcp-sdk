import type { NextAgent } from "../next-agent";

export class PromptManager {
  /** 固定系统提示词 */
  private staticPrompt = "";
  /** 元数据提示词 */
  private skillMetaPrompt = "";
  /** 临时系统提示词，比如： get-skill-content的返回值 */
  private tempPrompt = "";

  /** 返回全量的提示词 */
  getAll() {
    return `
当前时间：${new Date().toLocaleDateString()}。 思考内容和回复内容都要 用中文，简短，保持在2句话内。
${this.staticPrompt}
${this.skillMetaPrompt}
${this.tempPrompt}
`;
  }

  /** 设置常驻提示词 */
  setStatic(prompt: string) {
    this.staticPrompt = prompt;
  }
  /** 设置技能元数据提示词 */
  setSkillMeta(prompt: string) {
    this.skillMetaPrompt = prompt;
  }
  /** 设置临时值， 清除时传入空字符串即可，不再提供clearTemp */
  setTemp(prompt: string) {
    this.tempPrompt = prompt;
  }

  /** 累增临时值，为多agent时预留 */
  appendTemp(prompt: string) {
    this.tempPrompt += prompt;
  }
}

export function usePromptManager(agent: NextAgent) {
  const promptManager = new PromptManager();

  // 对话开始时，自动添加系统提示词。
  // ToolLoopAgent 没有system属性了， 且不允许同时设置 prompt, messages属性。 所以才手动拼接messages数组
  agent.on("chatStart", () => {
    agent.messages.value = agent.messages.value.filter(
      (msg) => msg.role !== "system",
    );
    agent.messages.value.unshift({
      role: "system",
      content: promptManager.getAll(),
    });
  });

  return promptManager;
}
