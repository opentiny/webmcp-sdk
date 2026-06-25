# Next Web Agent

它是面向在浏览器上运行的大模型智能体（Agent），底层依赖 `ai-sdk` 库。

## 能力边界

1. 直接与LLM api交互，遵循 open ai 协议接口。 如果需要兼容不同协议，需要自行提供 `Provider`。
2. 支持 McpServer 的配置， 尤其是原生 `WebMcp API`的支持。
3. 支持 Skills 的配置，渐进式的披露内容。
4. 支持系统提示词的管理。

## 使用方法
