# OpenTiny NEXT SDK

OpenTiny NEXT SDK

## 安装

```bash
npm install @opentiny/next-sdk
```

## 许可证

MIT

// onChunk: (chunkObj) => {
// console.log("onChunk", chunkObj);
// },
// // onFinish: (finishObj) => console.log("onFinish", finishObj),
// onStepFinish: (stepFinishObj) => console.log("onStepFinish", stepFinishObj),
// experimental_transform:
// //@ts-ignore
// ({ stopStream }) => {
// return new TransformStream({
// transform(chunk, controller) {
// console.log("transform chunk", chunk, controller);
// if (
// chunk.type == "tool-result" &&
// chunk.toolName == "getOrderbyDate" &&
// chunk.result.includes("没有")
// ) {
// // 停止流
// stopStream();
// console.log("已经停止流",chunk, result)
// setTimeout(() => {
// let askResult=confirm(chunk.result+", 你是否继续预订其它日期？")
// if(askResult){
// }
// }, 100);
// //@ts-ignore
// controller.enqueue({
// type: "step-finish",
// finishReason: "stop",
// logprobs: undefined,
// usage: {
// completionTokens: NaN,
// promptTokens: NaN,
// totalTokens: NaN,
// },
// request: {},
// response: {
// id: "response-id",
// modelId: "mock-model-id",
// timestamp: new Date(0),
// },
// warnings: [],
// isContinued: false,
// });
// //@ts-ignore
// controller.enqueue({
// type: "finish",
// finishReason: "stop",
// logprobs: undefined,
// usage: {
// completionTokens: NaN,
// promptTokens: NaN,
// totalTokens: NaN,
// },
// response: {
// id: "response-id",
// modelId: "mock-model-id",
// timestamp: new Date(0),
// },
// });
// return;
// }
// controller?.enqueue(chunk);
// },
// });
// },
// });
