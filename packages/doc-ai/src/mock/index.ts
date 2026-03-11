import { ref } from 'vue'

// --- Types ---
export interface InventoryItem {
  id: string
  productName: string
  sku: string
  quantity: number
  warehouse: string
  status: 'In Stock' | 'Low Stock' | 'Out of Stock'
  lastUpdated: string
}

export interface PriceProtectionOrder {
  id: string
  orderId: string
  customerName: string
  amount: number
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected'
  createdAt: string
  remark?: string
}

export interface OrderItem {
  id: string
  customerName: string
  customerPhone: string
  productName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Refunded' | 'Cancelled'
  paymentMethod: string
  createdAt: string
  shippedAt?: string
}

// --- Initial Mock Data ---
const initialInventory: InventoryItem[] = [
  {
    id: 'INV-1001',
    productName: 'iPhone 15 Pro Max',
    sku: 'APL-IP15PM-256-TI',
    quantity: 150,
    warehouse: '北京一号仓',
    status: 'In Stock',
    lastUpdated: '2026-03-09 10:00:00'
  },
  {
    id: 'INV-1002',
    productName: 'MacBook Pro M3 Max',
    sku: 'APL-MBP16-M3M-1T',
    quantity: 20,
    warehouse: '上海二号仓',
    status: 'Low Stock',
    lastUpdated: '2026-03-09 14:30:00'
  },
  {
    id: 'INV-1003',
    productName: 'AirPods Pro 2',
    sku: 'APL-APP2-WHT',
    quantity: 500,
    warehouse: '广州中心仓',
    status: 'In Stock',
    lastUpdated: '2026-03-10 09:15:00'
  },
  {
    id: 'INV-1004',
    productName: 'HUAWEI Mate 60 Pro',
    sku: 'HW-M60P-512-BLK',
    quantity: 0,
    warehouse: '深圳坂田仓',
    status: 'Out of Stock',
    lastUpdated: '2026-03-08 16:45:00'
  }
]

const initialPriceProtectionOrders: PriceProtectionOrder[] = [
  {
    id: 'PP-20260301-01',
    orderId: 'ORD-5X9A2B',
    customerName: '张三',
    amount: 300,
    reason: '百亿补贴活动降价',
    status: 'Approved',
    createdAt: '2026-03-01 11:20:00'
  },
  {
    id: 'PP-20260305-02',
    orderId: 'ORD-9K1M4P',
    customerName: '李四',
    amount: 500,
    reason: '618大促保底',
    status: 'Pending',
    createdAt: '2026-03-05 15:40:00'
  }
]

// --- State ---
export const inventoryList = ref<InventoryItem[]>(initialInventory)
export const priceProtectionList = ref<PriceProtectionOrder[]>(initialPriceProtectionOrders)

// --- Actions ---
export const addInventory = (item: Omit<InventoryItem, 'id' | 'status' | 'lastUpdated'>) => {
  const newId = `INV-${1005 + inventoryList.value.length}`
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  let status: InventoryItem['status'] = 'In Stock'
  if (item.quantity === 0) status = 'Out of Stock'
  else if (item.quantity < 50) status = 'Low Stock'

  inventoryList.value.unshift({
    ...item,
    id: newId,
    status,
    lastUpdated: now
  })
}

export const addPriceProtectionOrder = (order: Omit<PriceProtectionOrder, 'id' | 'status' | 'createdAt'>) => {
  const newId = `PP-${new Date().toISOString().replace(/[-:T]/g, '').substring(0, 8)}-${String(priceProtectionList.value.length + 1).padStart(2, '0')}`
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  priceProtectionList.value.unshift({
    ...order,
    id: newId,
    status: 'Pending',
    createdAt: now
  })
}

// --- Orders Mock Data ---
const initialOrders: OrderItem[] = [
  {
    id: 'ORD-5X9A2B',
    customerName: '张三',
    customerPhone: '138-0000-1111',
    productName: 'iPhone 15 Pro Max 256G 钛金色',
    quantity: 1,
    unitPrice: 9999,
    totalAmount: 9999,
    status: 'Delivered',
    paymentMethod: '微信支付',
    createdAt: '2026-02-20 10:30:00',
    shippedAt: '2026-02-21 08:00:00'
  },
  {
    id: 'ORD-9K1M4P',
    customerName: '李四',
    customerPhone: '139-0000-2222',
    productName: 'MacBook Pro M3 Max 1T',
    quantity: 1,
    unitPrice: 24999,
    totalAmount: 24999,
    status: 'Delivered',
    paymentMethod: '支付宝',
    createdAt: '2026-02-25 14:10:00',
    shippedAt: '2026-02-26 10:00:00'
  },
  {
    id: 'ORD-3Q7R8S',
    customerName: '王五',
    customerPhone: '136-0000-3333',
    productName: 'AirPods Pro 2',
    quantity: 2,
    unitPrice: 1799,
    totalAmount: 3598,
    status: 'Shipped',
    paymentMethod: '微信支付',
    createdAt: '2026-03-08 09:15:00',
    shippedAt: '2026-03-09 11:00:00'
  },
  {
    id: 'ORD-7T2U5V',
    customerName: '赵六',
    customerPhone: '135-0000-4444',
    productName: 'iPad Pro 2024 M4 256G',
    quantity: 1,
    unitPrice: 8999,
    totalAmount: 8999,
    status: 'Pending',
    paymentMethod: '银行卡',
    createdAt: '2026-03-10 16:40:00'
  },
  {
    id: 'ORD-2W6X9Y',
    customerName: '孙七',
    customerPhone: '137-0000-5555',
    productName: 'HUAWEI Mate 60 Pro 512G',
    quantity: 1,
    unitPrice: 7999,
    totalAmount: 7999,
    status: 'Refunded',
    paymentMethod: '支付宝',
    createdAt: '2026-03-01 11:00:00',
    shippedAt: '2026-03-02 09:00:00'
  }
]

export const orderList = ref<OrderItem[]>(initialOrders)
