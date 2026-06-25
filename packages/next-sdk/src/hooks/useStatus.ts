import { ref, type Ref } from "vue";
import type { NextAgent, UIMessage } from "../next-agent";
import type { FinishReason } from "ai";
import type { StartContent } from "../streamVisitor";

export type NextAgentStatus =
  | "init" // 初始状态
  | "processing" // AI请求正在处理中, 还未响应，显示加载动画
  | "streaming" // 流式响应中分块数据返回中
  | "error"
  | "aborted"
  | "finished"; // ai-sdk 的finishReason 的其它结束方式

export const useStatus = (agent: NextAgent) => {
  const status = ref<NextAgentStatus>("init");

  function setStatus(reason: FinishReason | "processing" | "streaming") {
    if (reason === "other") status.value = "aborted";
    else if (["processing", "streaming", "error"].includes(reason))
      status.value = reason as NextAgentStatus;
    else status.value = "finished";
  }
  // **************** 生命周期  ****************
  agent.on("chatStart", () => {
    setStatus("processing");
  });

  agent.on("chatEnd", () => {
    const last = agent.uiMessages.value.slice(-1)[0] as UIMessage;
    if (last?.role === "assistant") {
      setStatus(last.content.value?.finishReason || "stop");
    } else {
      setStatus("stop");
    }
  });

  agent.on("chatStep", () => {
    setStatus("streaming");
  });
  return status;
};
