# Web 端 Skills 开发实现方案

> 本文档描述在 **无文件系统** 的 Web 环境下，如何通过「内存 + CDN」和 **Web MCP** 实现与业界 Skills 格式兼容的能力，并协同完成超大应用的智能化改造。

## 一、核心概念

### 1.1 与业界 Skills 的差异（为什么需要 Web-Skills）

| 特性 | 业界 Skills (Cursor/IDE) | Web-Skills (Browser) |
|------|-------------------------|---------------------|
| **文档存储** | 本地文件系统（可创建、读取、删除文件） | **无文件系统**：内存对象 + 云端 CDN |
| **子文档引用** | 相对路径 `./docs/xxx.md` 直接读文件 | 通过 **内置 Web MCP 工具** 读取内存或远端 CDN |
| **工具执行** | MCP Server (Node.js) | Web MCP（浏览器环境） |
| **生命周期** | 静态加载 | 动态注册/卸载，支持热更新 |
| **应用场景** | 代码开发辅助 | **Web 应用智能化改造**、超大应用 AI 化 |

**核心差异总结**：Web 端没有文件管理系统，不能像 IDE 那样「创建/读取/删除文件」。因此我们采用「**格式与业界 Skills 保持一致 + 子文档通过 Web MCP 披露**」的策略：主文档仍为 SKILL.md 风格（YAML frontmatter + Markdown），子文档的披露改为通过 `read_memory_doc`、`read_cdn_doc` 等内置 Web MCP 工具读取内存或远端 CDN，从而在 Web 端等效替代业界 Skills 中的文件操作方式。

### 1.2 技术架构

```
┌─────────────────────────────────────────────────────┐
│                   AI Assistant                      │
│              (Claude/GPT 等大模型)                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ├─ 读取 Skill 元数据
                 ├─ 理解使用场景和约束
                 └─ 调用 Web MCP Tools
                 │
┌────────────────▼────────────────────────────────────┐
│              Skills Manager                         │
│  ┌──────────────────────────────────────────────┐  │
│  │  Skill Registry (内存中的 Skill 注册表)      │  │
│  │  - skillId: 唯一标识                         │  │
│  │  - metadata: 元数据 (name, version, etc)     │  │
│  │  - content: 主文档内容                        │  │
│  │  - subDocs: 子文档引用映射                   │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  核心能力:                                          │
│  - registerSkill()   注册 Skill                    │
│  - unregisterSkill() 卸载 Skill                    │
│  - getSkillContent() 获取 Skill 内容               │
│  - loadSubDoc()      加载子文档                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ├─ 通过 Web MCP 读取文档
                 │
┌────────────────▼────────────────────────────────────┐
│             Web MCP Server                          │
│  ┌──────────────────────────────────────────────┐  │
│  │  Document Loader Tools                       │  │
│  │  - read_memory_doc: 读取内存文档             │  │
│  │  - read_cdn_doc: 读取 CDN 文档               │  │
│  │  - list_skills: 列出所有可用 Skills          │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Business Tools (业务工具)                   │  │
│  │  - 商品管理 (CRUD)                            │  │
│  │  - 数据查询                                   │  │
│  │  - 表单操作                                   │  │
│  └──────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│          Document Sources                           │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  内存对象   │  │  CDN 资源   │  │ IndexedDB  │  │
│  │  (JSON)     │  │  (Markdown) │  │  (缓存)    │  │
│  └─────────────┘  └─────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 二、实现细节

### 2.1 Skill 文档格式规范

**主文档 (SKILL.md)**: 保持与业界兼容

```markdown
---
name: product-management-skill
description: 商品管理系统的智能辅助，提供商品增删改查、库存管理等能力
license: MIT
metadata:
  author: your-name
  version: "1.0.0"
  category: business
  tags: [e-commerce, product, crud]
---

# 商品管理助手

本技能为商品管理后台提供智能化能力，支持自然语言操作商品数据。

## 使用时机

- 批量管理商品信息
- 查询和分析商品数据
- 快速修改商品属性
- 生成商品报表

## 文档结构

使用 `read_memory_doc` 或 `read_cdn_doc` 工具读取以下子文档：

| 文档ID | 描述 | 来源 |
|-------|------|------|
| api-reference | API 接口文档 | memory |
| business-rules | 业务规则说明 | cdn |
| examples | 使用示例 | memory |

## 使用方法

1. **查询商品**: 使用 `query_products` 工具
2. **添加商品**: 使用 `add_product` 工具
3. **更新商品**: 使用 `update_product` 工具
4. **删除商品**: 使用 `delete_product` 工具

详细文档请调用: `read_memory_doc("product-management-skill:api-reference")`

## 重要约束

- 删除操作需要二次确认
- 价格字段必须为正数
- 库存不能为负数
```

### 2.2 Skills Manager 实现

核心数据结构：

```typescript
interface WebSkill {
  id: string                    // 唯一标识
  metadata: {
    name: string
    description: string
    version: string
    author?: string
    category?: string
    tags?: string[]
  }
  content: string               // 主文档内容 (Markdown)
  subDocs: Map<string, {        // 子文档引用
    docId: string               // 文档ID
    source: 'memory' | 'cdn'    // 来源类型
    path?: string               // CDN 路径
    content?: string            // 内存内容
  }>
  mcpTools?: string[]           // 关联的 MCP 工具列表
}

class SkillsManager {
  private skills = new Map<string, WebSkill>()
  private mcpServer: WebMcpServer
  
  // 注册 Skill
  async registerSkill(skill: WebSkill): Promise<void>
  
  // 卸载 Skill  
  unregisterSkill(skillId: string): void
  
  // 获取 Skill 主文档
  getSkillContent(skillId: string): string | undefined
  
  // 加载子文档
  async loadSubDoc(skillId: string, docId: string): Promise<string>
  
  // 列出所有 Skills
  listSkills(): WebSkill[]
}
```

### 2.3 Web MCP 工具注册

```typescript
// 1. 文档读取工具
server.registerTool(
  'read_memory_doc',
  {
    description: '从内存中读取 Skill 子文档',
    inputSchema: {
      docPath: z.string().describe('文档路径，格式: skillId:docId')
    }
  },
  async ({ docPath }) => {
    const [skillId, docId] = docPath.split(':')
    const content = await skillsManager.loadSubDoc(skillId, docId)
    return { content: [{ type: 'text', text: content }] }
  }
)

server.registerTool(
  'read_cdn_doc',
  {
    description: '从 CDN 读取 Skill 文档',
    inputSchema: {
      url: z.string().url().describe('CDN 文档 URL')
    }
  },
  async ({ url }) => {
    const response = await fetch(url)
    const content = await response.text()
    return { content: [{ type: 'text', text: content }] }
  }
)

// 2. Skill 管理工具
server.registerTool(
  'list_skills',
  {
    description: '列出所有可用的 Skills'
  },
  async () => {
    const skills = skillsManager.listSkills()
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(skills.map(s => ({
          id: s.id,
          name: s.metadata.name,
          description: s.metadata.description
        })), null, 2)
      }]
    }
  }
)
```

## 三、商品管理 Demo 工程

### 3.1 目录结构

```
packages/doc-ai/
├── src/
│   ├── skills/
│   │   └── product-management/
│   │       ├── SKILL.md                 # 主 Skill 文档
│   │       ├── index.ts                 # Skill 注册逻辑
│   │       ├── docs/                    # 子文档 (内存数据)
│   │       │   ├── api-reference.md
│   │       │   ├── examples.md
│   │       │   └── business-rules.md
│   │       └── tools/                   # MCP 工具实现
│   │           ├── query-products.ts
│   │           ├── add-product.ts
│   │           ├── update-product.ts
│   │           └── delete-product.ts
│   ├── composable/
│   │   ├── useSkillsManager.ts          # Skills Manager
│   │   └── useProductMcp.ts             # 商品管理 MCP
│   └── views/
│       └── comprehensive/
│           └── index.vue                # 商品管理页面
```

### 3.2 核心功能

#### 商品管理后台能力清单

1. **基础 CRUD**
   - ✅ 查询商品列表 (支持筛选、排序)
   - ✅ 添加新商品
   - ✅ 编辑商品信息
   - ✅ 删除商品

2. **批量操作**
   - ✅ 批量上架/下架
   - ✅ 批量修改价格
   - ✅ 批量调整库存

3. **智能分析**
   - 📊 库存预警分析
   - 📊 价格趋势分析
   - 📊 畅销商品推荐

4. **自然语言交互**
   - 💬 "把所有手机类商品价格降低 10%"
   - 💬 "查询库存低于 10 的商品"
   - 💬 "上架所有平板电脑"

## 四、Web-Skill 与 Web-MCP 的协同（超大应用智能化改造）

### 4.1 协同模型

- **Web-Skill**：描述「做什么、何时用、约束与子文档结构」，格式与业界 Skills 一致，便于跨平台共享。
- **Web-MCP**：提供「怎么做」——文档读取（`read_memory_doc` / `read_cdn_doc`）、业务工具（如商品 CRUD、批量操作）等。
- **协同方式**：AI 先通过 Skill 主文档理解能力与约束，再按需调用 Web MCP 工具读取子文档或执行业务，从而在 **无文件系统** 的 Web 端完成与业界 Skills 等效的「文档 + 工具」智能化。

### 4.2 超大应用改造场景

1. **多业务域**：每个业务域一个 Skill（商品、订单、用户等），子文档存内存或 CDN，由 Web MCP 统一披露。
2. **动态扩展**：新业务域通过 `registerSkill` 注册，无需重启；CDN 子文档可热更新。
3. **统一入口**：`list_skills` 列出所有能力，AI 按用户意图选择对应 Skill 与工具组合。

本方案通过 **商品管理后台 Demo**（见第三节）验证：主文档 + 内存子文档 + Web MCP 工具（含 `read_memory_doc` / `read_cdn_doc`）可完整支撑自然语言操作商品数据，为更大规模 Web 应用智能化提供可复用模式。

## 五、与业界 Skills 的协同

### 5.1 渐进式增强

```typescript
// 检测环境，自动选择合适的文档加载方式
function detectEnvironment() {
  if (typeof window !== 'undefined') {
    // 浏览器环境，使用 Web-Skills
    return 'web'
  } else if (typeof process !== 'undefined') {
    // Node.js 环境，使用传统 Skills
    return 'node'
  }
}

// 统一的 Skill 加载接口
async function loadSkillDoc(path: string) {
  const env = detectEnvironment()
  
  if (env === 'web') {
    // 使用 Web MCP 工具
    return await callMcpTool('read_memory_doc', { docPath: path })
  } else {
    // 使用文件系统
    return await fs.readFile(path, 'utf-8')
  }
}
```

### 5.2 跨平台 Skill 共享

通过 CDN 托管 Skill 文档，实现跨平台共享：

```
https://cdn.example.com/skills/
├── product-management/
│   ├── SKILL.md
│   ├── api-reference.md
│   └── examples.md
└── order-management/
    ├── SKILL.md
    └── workflows.md
```

IDE 和 Web 都可以通过统一的 URL 访问这些文档。

## 六、优势与创新点

### 6.1 核心优势

1. **无需文件系统**: 完全在浏览器环境运行
2. **动态性强**: 运行时注册/卸载，支持热更新
3. **分布式协作**: CDN + 内存，支持大规模应用
4. **渐进式增强**: 与传统 Skills 格式兼容

### 6.2 创新点

1. **首创 Web-Skills 概念**: 将 Skills 机制引入 Web 应用
2. **MCP 协同**: Skill 描述能力，MCP 执行工具
3. **混合存储**: 内存 + CDN，兼顾性能与灵活性
4. **超大应用改造**: 适合复杂的企业级 Web 应用

## 七、实施路线图

### Phase 1: 基础设施 (Week 1-2)
- [ ] 实现 SkillsManager 核心逻辑
- [ ] 开发文档加载 MCP 工具
- [ ] 完成商品管理 Demo 页面

### Phase 2: 商品管理 Skill (Week 3)
- [ ] 编写 SKILL.md 主文档
- [ ] 实现商品 CRUD MCP 工具
- [ ] 添加批量操作能力

### Phase 3: 智能化增强 (Week 4)
- [ ] 集成 AI 对话能力
- [ ] 实现自然语言操作
- [ ] 添加数据分析功能

### Phase 4: 优化与扩展 (Week 5+)
- [ ] 性能优化 (缓存、懒加载)
- [ ] 文档完善
- [ ] 创建更多 Demo Skills

## 八、商品管理 Demo 使用说明

### 8.1 如何运行

1. 在 monorepo 根目录执行 `pnpm install`，进入 `packages/doc-ai` 后执行 `pnpm dev`。
2. 打开综合示例（商品管理）页面：应用启动后默认进入 `/comprehensive`。
3. 使用 TinyRemoter 与 AI 对话，可验证：
   - **Skill 披露**：AI 可先调用 `list_skills` 了解已注册的「商品管理」Skill，再按主文档理解能力与约束。
   - **子文档读取**：AI 通过 `read_memory_doc("product-management:api-reference")` 等读取内存中的子文档，无需文件系统。
   - **CDN 文档**：需要时可通过 `read_cdn_doc(url)` 读取托管在 CDN 的 Markdown。
   - **业务工具**：自然语言触发 `query_products`、`add_product`、`batch_update_status`、`batch_adjust_price`、`get_inventory_report` 等，表格数据与 MCP 工具同源，操作后列表自动更新。

### 8.2 与业界 Skills 的对应关系

| 业界 Skills (IDE) | Web-Skills (本 Demo) |
|------------------|----------------------|
| 主文档 SKILL.md 放在仓库目录 | 主文档内容在内存中，格式一致（YAML frontmatter + Markdown） |
| 子文档 `./docs/xxx.md` 读文件 | `read_memory_doc("skillId:docId")` 或 `read_cdn_doc(url)` |
| MCP Server 提供业务工具 | 同一 WebMcpServer 注册文档工具 + 商品 CRUD/批量工具 |

## 九、参考资源

- [MCP 协议规范](https://modelcontextprotocol.io/)
- [Cursor Rules 文档](https://docs.cursor.com/)
- [OpenTiny Next SDK](https://github.com/opentiny/next-sdk)
