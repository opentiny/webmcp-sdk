export interface LabelPosition {
  top: number
  left: number
}

export function computeLabelPosition(
  rect: DOMRect,
  labelWidth: number,
  labelHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): LabelPosition {
  let top = rect.top + 2
  let left = rect.left + rect.width - labelWidth - 2

  if (rect.width < labelWidth + 4 || rect.height < labelHeight + 4) {
    top = rect.top - labelHeight - 2
    left = rect.left + rect.width - labelWidth
    if (left < rect.left) left = rect.left
  }

  return {
    top: Math.max(0, Math.min(top, viewportHeight - labelHeight)),
    left: Math.max(0, Math.min(left, viewportWidth - labelWidth)),
  }
}
