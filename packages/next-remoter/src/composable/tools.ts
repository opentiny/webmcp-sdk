import { z } from '@opentiny/next-sdk'
import { tool } from 'ai'
import dayjs from 'dayjs'

export const getToday = tool({
  description: '获取今天的日期',
  inputSchema: z.object({}),
  execute: () => ({
    date: `当前日期: ${dayjs().format('YYYY-M-D')}`
  })
})
