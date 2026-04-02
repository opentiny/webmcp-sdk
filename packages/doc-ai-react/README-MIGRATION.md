# doc-ai-react - React 版本

本项目是 `doc-ai` (Vue 版本) 的 React 复刻版，完整保留了所有功能和 UI 设计。

## 项目结构

```
src/
├── components/          # React 组件和页面
│   ├── HomePage.tsx           # 概览大盘（首页）
│   ├── InventoryPage.tsx      # 库存管理页面
│   ├── InventoryModal.tsx     # 入库弹窗组件
│   ├── PriceProtectionPage.tsx # 价保监控页面
│   ├── PriceProtectionModal.tsx # 价保申请弹窗
│   ├── OrdersPage.tsx         # 订单管理页面
│   ├── SalesPage.tsx          # 商品销售记录页面
│   ├── FinancePage.tsx        # 财务管理页面
│   └── NotFoundPage.tsx       # 404 页面
├── mock/                # Mock 数据
│   └── index.ts
├── mcp-servers/         # MCP 服务器配置
│   ├── index.ts
│   ├── common.ts
│   ├── useWebAgentServer.ts
│   └── finance/
│       └── tools.ts
├── router.ts            # 路由配置
├── App.tsx              # 主应用组件（含侧边栏、AI 面板）
├── App.css              # 全局样式
└── const.ts             # 常量定义
```

## 路由映射

| Vue 路由            | React 路由          | 页面组件                        |
| ------------------- | ------------------- | ------------------------------- |
| `/`                 | `/`                 | HomePage（概览大盘）            |
| `/inventory`        | `/inventory`        | InventoryPage（库存管理）       |
| `/price-protection` | `/price-protection` | PriceProtectionPage（价保监控） |
| `/orders`           | `/orders`           | OrdersPage（订单管理）          |
| `/sales`            | `/sales`            | SalesPage（商品销售记录）       |
| `/finance`          | `/finance`          | FinancePage（财务管理）         |
| `*`                 | `*`                 | NotFoundPage（404）             |

## 核心功能

### 1. 主布局

- ✅ 左侧系统视图（侧边栏导航 + 内容区）
- ✅ 右侧 AI 助手面板（TinyRobot）
- ✅ 可拖拽调整宽度的分隔条
- ✅ 响应式设计

### 2. MCP 集成

- ✅ 本地 MCP Server
- ✅ WebAgent 远程连接
- ✅ 工具注册与调用
- ✅ 技能文档加载

### 3. 业务页面

- **概览大盘**：统计卡片 + 使用指引
- **库存管理**：库存列表 + 入库弹窗
- **价保监控**：价保单列表 + 审批流程 + 申请弹窗
- **订单管理**：订单列表 + 搜索筛选
- **销售记录**：统计图表 + 热销排行
- **财务管理**：财务概览 + 交易记录

### 4. UI/UX

- ✅ 完整的 CSS 样式（与 Vue 版本一致）
- ✅ 动画效果（fadeIn、pulse 等）
- ✅ 玻璃态设计
- ✅ 渐变色彩
- ✅ 响应式表格

## 技术栈

- **框架**: React 19.2.0
- **路由**: react-router-dom 7.13.1
- **UI 组件**: TinyRobot (@opentiny/next-remoter)
- **MCP SDK**: @opentiny/next-sdk
- **构建工具**: Vite
- **语言**: TypeScript

## 运行项目

```bash
# 安装依赖
pnpm install

# 启动开发服务器（同时启动 React 和 Remoter）
pnpm dev

# 或分别启动
pnpm dev:react    # 仅 React 前端
pnpm dev:remoter  # 仅 Remoter 组件

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

## 与 Vue 版本的差异

### 实现方式不同

1. **路由**: Vue Router → React Router (createBrowserRouter)
2. **状态管理**: Vue ref/reactive → React useState/useRef
3. **生命周期**: Vue onMounted/onUnmounted → React useEffect
4. **组件通信**: Vue props/emit → React props/ref/callbacks
5. **模板语法**: Vue template → React JSX

### 代码组织

- Vue 的单文件组件 (.vue) → React 的 TSX 文件 (.tsx)
- Vue 的 `<script setup>` → React 的函数组件 + Hooks
- Vue 的 scoped styles → React 的全局 CSS + className

### API 调用

- Vue 版本使用 `modelContext.registerTool`
- React 版本使用 `registerTool` / `unregisterTool`（根据实际 SDK API 调整）

## 注意事项

1. **TypeScript 类型检查**: 部分 HTML 属性（如 `width`, `align`）在 React 中需要符合 TypeScript 类型定义
2. **模态框实现**: Vue 版本使用 TinyVue 的 Dialog 组件，React 版本使用自定义实现
3. **表格组件**: Vue 版本使用 TinyGrid，React 版本使用原生 table 元素
4. **图标**: Vue 版本使用 @opentiny/vue-icon，React 版本使用内联 SVG 或 emoji

## 后续优化建议

1. **图表库**: 可以集成 recharts 或 echarts-for-react 来替换占位图表
2. **UI 组件库**: 可以引入 TinyVue React 版本或其他 React UI 库
3. **状态管理**: 复杂场景可使用 Zustand 或 Redux Toolkit
4. **类型安全**: 完善所有组件的 Props 和 State 类型定义

## 开发者

本迁移由 OpenTiny NEXT-SDKs 团队完成，遵循相同的架构设计和用户体验标准。
