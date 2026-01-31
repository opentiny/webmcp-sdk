/**
 * 商品数据类型定义
 */

// 商品分类
export type ProductCategory = 'phones' | 'laptops' | 'tablets'

// 商品状态
export type ProductStatus = 'on' | 'off'

// 商品接口
export interface Product {
  id: string // 商品唯一标识
  name: string // 商品名称
  price: number // 价格（元）
  stock: number // 库存数量
  category: ProductCategory // 商品分类
  status: ProductStatus // 商品状态
  description?: string // 商品描述
  image?: string // 商品图片URL
  createdAt?: string // 创建时间
  updatedAt?: string // 更新时间
}

// 查询商品参数
export interface QueryProductsInput {
  category?: ProductCategory
  status?: ProductStatus
  minPrice?: number
  maxPrice?: number
  lowStock?: boolean // 是否只查询低库存（< 10）
  keyword?: string // 关键词搜索
  sortBy?: 'price' | 'stock' | 'name'
  sortOrder?: 'asc' | 'desc'
}

// 查询商品结果
export interface QueryProductsResult {
  products: Product[]
  total: number
  summary: {
    totalValue: number // 总价值
    avgPrice: number // 平均价格
    totalStock: number // 总库存
  }
}

// 添加商品参数
export interface AddProductInput {
  name: string
  price: number
  stock: number
  category: ProductCategory
  status?: ProductStatus
  description?: string
  image?: string
}

// 更新商品参数
export interface UpdateProductInput {
  id: string
  name?: string
  price?: number
  stock?: number
  category?: ProductCategory
  status?: ProductStatus
  description?: string
  image?: string
}

// 删除商品参数
export interface DeleteProductInput {
  id: string
  confirm?: boolean
}

// 批量更新状态参数
export interface BatchUpdateStatusInput {
  ids: string[]
  status: ProductStatus
}

// 批量调整价格参数
export interface BatchAdjustPriceInput {
  ids: string[]
  adjustType: 'percent' | 'fixed'
  adjustValue: number
}

// 批量调整库存参数
export interface BatchAdjustStockInput {
  ids: string[]
  adjustType: 'set' | 'add'
  adjustValue: number
}

// 操作结果
export interface OperationResult {
  success: boolean
  message: string
  data?: any
}

// 批量操作结果
export interface BatchOperationResult {
  success: boolean
  updated: number
  failed: number
  results: Array<{
    id: string
    success: boolean
    error?: string
  }>
  message: string
}

// 库存报告
export interface InventoryReport {
  timestamp: string
  summary: {
    totalProducts: number
    totalValue: number
    totalStock: number
    avgPrice: number
    avgStock: number
  }
  lowStock: Product[]
  highValue: Product[]
  byCategory: Record<
    string,
    {
      count: number
      totalValue: number
      avgPrice: number
    }
  >
  byStatus: {
    on: number
    off: number
  }
  recommendations: string[]
}

// 分类标签映射
export const categoryLabels: Record<ProductCategory, string> = {
  phones: '手机',
  laptops: '笔记本',
  tablets: '平板'
}

// 状态标签映射
export const statusLabels: Record<ProductStatus, string> = {
  on: '上架',
  off: '下架'
}
