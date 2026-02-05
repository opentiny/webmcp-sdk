import type { SkillHandler } from '../types'

/**
 * 商品管理指南 Handler
 *
 * 这个 handler 演示如何使用 VFS 读取指南文档并提供智能检索功能
 */

// 搜索指南内容
export const searchGuideHandler: SkillHandler = async (args, context) => {
  const { keyword } = args

  try {
    // 从 VFS 读取商品管理指南文档（假设存放在 public 或者远程）
    // 这里演示从一个虚拟路径读取
    const guideContent = await context.vfs.readFile('/public/product-guide.md').catch(() => {
      // 如果没有实际文件，返回模拟数据
      return `# 商品管理指南

## 商品创建
1. 登录系统
2. 进入商品管理页面
3. 点击"新建商品"按钮
4. 填写商品信息（名称、价格、库存等）
5. 上传商品图片
6. 点击"保存"完成创建

## 库存管理
- 实时库存查看
- 库存预警设置
- 批量导入导出
- 库存盘点功能

## 价格管理
- 统一调价
- 促销价设置
- 会员价配置
- 阶梯价格

## 商品分类
- 创建分类层级
- 商品归类
- 批量移动分类`
    })

    // 简单的关键词搜索
    const lines = guideContent.split('\n')
    const matchedSections: string[] = []

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(keyword.toLowerCase())) {
        // 找到匹配行，提取上下文
        const start = Math.max(0, i - 2)
        const end = Math.min(lines.length, i + 5)
        matchedSections.push(lines.slice(start, end).join('\n'))
      }
    }

    if (matchedSections.length === 0) {
      return {
        found: false,
        message: `未找到与"${keyword}"相关的内容`
      }
    }

    return {
      found: true,
      keyword,
      matches: matchedSections,
      count: matchedSections.length
    }
  } catch (error: any) {
    return {
      error: error.message
    }
  }
}

// 获取指南章节
export const getSectionHandler: SkillHandler = async (args, context) => {
  const { section } = args

  const sectionMap: Record<string, string> = {
    '商品创建': `# 商品创建流程

1. **登录系统**
   - 使用管理员账号登录
   - 进入后台管理界面

2. **导航到商品管理**
   - 点击左侧菜单"商品管理"
   - 选择"商品列表"

3. **新建商品**
   - 点击"新建商品"按钮
   - 填写必填项：商品名称、价格、库存
   - 选填项：描述、规格、品牌等

4. **上传图片**
   - 支持jpg、png格式
   - 建议尺寸：800x800
   - 最多上传5张

5. **保存发布**
   - 点击"保存"暂存草稿
   - 点击"发布"正式上架`,

    '库存管理': `# 库存管理

## 实时库存
- 查看当前库存数量
- 库存变动记录
- 多仓库管理

## 库存预警
- 设置最低库存阈值
- 自动预警通知
- 补货建议

## 批量操作
- 导入/导出库存
- 批量调整库存
- 库存盘点`,

    '价格管理': `# 价格管理

## 基础价格
- 商品原价设置
- 成本价录入

## 促销价
- 限时促销价
- 满减/满折
- 优惠券配置

## 会员价
- 不同等级会员价
- 批发价设置`
  }

  if (sectionMap[section]) {
    return {
      section,
      content: sectionMap[section]
    }
  }

  return {
    error: `章节"${section}"不存在`,
    availableSections: Object.keys(sectionMap)
  }
}
