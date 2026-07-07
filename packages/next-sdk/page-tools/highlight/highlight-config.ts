export const PAGE_AGENT_HIGHLIGHT_CONTAINER_ID = 'page-agent-highlight-container'
export const PAGE_AGENT_HIGHLIGHT_Z_INDEX = 2147483640

const DEFAULT_HIGHLIGHT_COLORS = [
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFA500',
  '#800080',
  '#008080',
  '#FF69B4',
  '#4B0082',
  '#FF4500',
  '#2E8B57',
  '#DC143C',
  '#4682B4',
]

export interface PageAgentHighlightOptions {
  enabled?: boolean
  showBorder?: boolean
  showLabel?: boolean
  maxElements?: number
  minWidth?: number
  minHeight?: number
  minArea?: number
  borderWidth?: number
  highlightOpacity?: number
  highlightLabelOpacity?: number
  colors?: string[]
}

export interface ResolvedPageAgentHighlightOptions {
  enabled: boolean
  showBorder: boolean
  showLabel: boolean
  maxElements: number
  minWidth: number
  minHeight: number
  minArea: number
  borderWidth: number
  highlightOpacity: number
  highlightLabelOpacity: number
  colors: string[]
}

export const DEFAULT_PAGE_AGENT_HIGHLIGHT_OPTIONS: ResolvedPageAgentHighlightOptions = {
  enabled: true,
  showBorder: true,
  showLabel: true,
  maxElements: 120,
  minWidth: 12,
  minHeight: 10,
  minArea: 180,
  borderWidth: 2,
  highlightOpacity: 0.1,
  highlightLabelOpacity: 0.5,
  colors: DEFAULT_HIGHLIGHT_COLORS,
}

function clamp(min: number, value: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function resolveHighlightOptions(
  options?: PageAgentHighlightOptions,
): ResolvedPageAgentHighlightOptions {
  const merged = {
    ...DEFAULT_PAGE_AGENT_HIGHLIGHT_OPTIONS,
    ...options,
  }

  const colors = Array.isArray(options?.colors) && options.colors.length > 0
    ? options.colors
    : DEFAULT_HIGHLIGHT_COLORS

  return {
    ...merged,
    colors,
    maxElements: clamp(1, Math.floor(merged.maxElements), 5000),
    minWidth: clamp(1, merged.minWidth, 200),
    minHeight: clamp(1, merged.minHeight, 200),
    minArea: clamp(1, merged.minArea, 100000),
    borderWidth: clamp(1, merged.borderWidth, 8),
    highlightOpacity: clamp(0, merged.highlightOpacity, 1),
    highlightLabelOpacity: clamp(0, merged.highlightLabelOpacity, 1),
  }
}
