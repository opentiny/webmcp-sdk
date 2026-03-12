# Doc AI React 页面说明

本项目已成功从 Angular 复刻了三个页面到 React，保持了功能一致、CSS 样式完全复用、UI 界面一致。

## 页面列表

### 1. HomePage (首页)

- **路径**: `/`
- **文件**: `src/components/HomePage.tsx`
- **功能**:
  - 商品管理系统首页展示
  - 显示商品统计信息 (总数、上架中、已下架、商品分类)
  - 显示价保待审核和待退差价总额
  - 分类概览进度条
  - 近期商品列表
  - 价保申请列表

### 2. ComprehensivePage (商品管理)

- **路径**: `/comprehensive`
- **文件**: `src/components/ComprehensivePage.tsx`
- **功能**:
  - 商品列表表格展示
  - 支持行内编辑 (商品名称、价格、库存)
  - 切换商品上架/下架状态
  - 集成了 MCP 工具 `product-guide`

### 3. PriceProtectionPage (价保管理)

- **路径**: `/price-protection`
- **文件**: `src/components/PriceProtectionPage.tsx`
- **功能**:
  - 价保申请列表表格展示
  - 显示各状态数量统计 (待审核、已通过、已拒绝、已过期)
  - 支持审核通过/拒绝操作
  - 集成了 MCP 工具 `price-protection-query`、`price-protection-review`、`price-protection-detail`

## 技术栈

- React 19.2.0
- React Router DOM 7.13.1 (用于页面路由)
- TypeScript
- Vite 7.1.10
- @opentiny/next-sdk 0.2.6-beta.2 (MCP 协议支持)

## 运行项目

```bash
cd e:\next-sdk\packages\doc-ai-react
pnpm dev:react
```

访问 http://localhost:5174 查看应用

## 项目结构

```
src/
├── components/
│   ├── HomePage.tsx              # 首页组件
│   ├── HomePage.css              # 首页样式
│   ├── ComprehensivePage.tsx     # 商品管理组件
│   ├── ComprehensivePage.css     # 商品管理样式
│   ├── PriceProtectionPage.tsx   # 价保管理组件
│   ├── PriceProtectionPage.css   # 价保管理样式
│   ├── index.ts                  # 组件导出
│   └── data/
│       ├── products.json         # 商品数据
│       └── priceProtection.json  # 价保申请数据
├── App.tsx                       # 主应用 (包含路由配置)
└── main.tsx                      # 入口文件
```

## 与 Angular 版本的对应关系

| React 文件                | Angular 文件                    |
| ------------------------- | ------------------------------- |
| `HomePage.tsx`            | `home.component.ts`             |
| `ComprehensivePage.tsx`   | `comprehensive.component.ts`    |
| `PriceProtectionPage.tsx` | `price-protection.component.ts` |

所有 CSS 样式都从 Angular 版本完全复用，确保了 UI 界面的一致性。
