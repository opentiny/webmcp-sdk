---
name: read-doc
description: 从虚拟文件系统读取文档内容。支持 HTTP URL 和本地打包资源。当需要读取文档、指南或配置文件时使用此技能。
---

# Read Document Skill

此技能提供文档读取功能，支持多种数据源。

## 输入参数

- `path` (string): 文档路径
  - HTTP/HTTPS URL: 从网络获取文档
  - 本地路径: 从打包资源中读取
  - MCP 路径: 通过 MCP 服务器读取（如果可用）

## 使用场景

当需要读取以下内容时，使用此技能：

- 在线文档（Markdown、文本文件）
- 本地打包的指南和参考资料
- 配置文件
- 任何可通过路径访问的文本内容

## 数据源优先级

1. HTTP/HTTPS URL: 直接通过 `fetch` 获取
2. 本地打包资源: 使用 Vite 的 `import.meta.glob` 加载
3. MCP 服务器: 回退到 MCP `read_file` 工具

## Handler

此技能由 `readDocHandler` 处理。

## 示例

```javascript
// 读取网络文档
{
  path: 'https://example.com/guide.md'
}

// 读取本地资源
{
  path: '/public/product-guide.md'
}
```
