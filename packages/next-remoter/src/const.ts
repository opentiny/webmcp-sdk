import officePrompt from './prompt/office-prompt.md?raw'
import shopPrompt from './prompt/shop-prompt.md?raw'

export const OFFICE_PROMPT = officePrompt
export const SHOP_PROMPT = shopPrompt

export const STATUS = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ABORTED: 'aborted',
  ERROR: 'error'
} as const

export const GeneratingStatus: readonly string[] = ['processing']

