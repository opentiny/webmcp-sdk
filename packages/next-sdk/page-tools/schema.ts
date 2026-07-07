import { z } from 'zod'

export const inputSchema = z.object({
  action: z.enum(['browserState', 'click', 'fill', 'select', 'scroll', 'executeJavascript', 'searchTree'] as const)
    .describe(`执行的动作名称, 每一次执行 'click', 'fill', 'select'动作之前，**必须**要先调用 'browserState' 去获取页面的最新状态。 
      browserState: '查询整个页面的浏览器状态;返回页面的标题、URL、YAML格式的语义化页面树',
      click: '根据元素索引点击;',
      fill: '根据元素索引填写文本;'; 
      select: '根据元素索引选择下拉框选项;'; 
      scroll: '滚动页面的动作，可以指定水平滚动还是上下滚动; 不带元素索引时：滚动整个文档。带元素索引时：滚动该索引处的容器（或其最近的可滚动祖先元素）'
      executeJavascript: '执行javascript代码'
      searchTree: '按关键词搜索无障碍树，返回带行号的匹配节点及上下文，无需获取全量树。适合快速定位特定元素（如所有按钮、特定名称的链接等），显著减少上下文消耗。必须提供 query 参数。'
  `),
  index: z
    .number()
    .min(0)
    .optional()
    .describe('执行动作 of the element index, 动作为 click,fill,select时，必须提供元素索引'),
  text: z.string().optional().describe('执行动作的文本内容, 动作为 fill,select 时，必须提供文本内容'),
  down: z.boolean().optional().describe('执行上下滚动时，必须提供down参数'),
  right: z.boolean().optional().describe('执行水平滚动方向, 必须提供right参数'),
  numPages: z
    .number()
    .optional()
    .describe('执行动作的滚动页数, 动作为 scroll时，可以提供滚动页数，建议每次滚动0.1页，该值不要大于5.'),
  pixels: z.number().int().min(0).optional().describe('执行动作的滚动像素数，动作为 scroll时，可以提供滚动像素数'),
  script: z.string().optional().describe('执行的javascript代码，动作为 executeJavascript时，必须提供script参数'),
  query: z
    .string()
    .optional()
    .describe(
      '搜索关键词，动作为 searchTree 时必须提供。支持按 role（如 button、link）、节点名称、状态（如 checked）或 ref 索引（如 #3）搜索'
    ),
  contextLines: z
    .number()
    .int()
    .min(0)
    .max(10)
    .default(2)
    .describe('searchTree 时每个命中行前后保留的上下文行数，默认 2'),
  maxMatches: z.number().int().min(1).max(50).default(20).describe('searchTree 时最大返回分组数，默认 20'),
  responseMode: z
    .enum(['full', 'diff', 'both'] as const)
    .optional()
    .default('diff')
    .describe(
      '返回浏览器状态的模式。full: 仅返回当前全量 A11y 树；diff: 仅返回与上一次状态的增量差异；both: 同时返回全量 A11y 树与增量差异。默认值为 diff。'
    )
})

export type PageAgentToolInput = z.infer<typeof inputSchema>
