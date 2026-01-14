import { type VisualActionParams } from './utils'

export const handleWaitAction = async ({ time }: VisualActionParams) => {
  const waitTime = time || 1.5
  await new Promise((resolve) => setTimeout(resolve, waitTime * 1000))
  return `已成功等待 ${waitTime} 秒`
}
