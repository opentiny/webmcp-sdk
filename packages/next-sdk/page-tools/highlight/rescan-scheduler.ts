export interface RescanSchedulerOptions {
  debounceMs?: number
}

export interface RescanScheduler {
  schedule: () => void
  cancel: () => void
}

export function createRescanScheduler(
  callback: () => void,
  options?: RescanSchedulerOptions,
): RescanScheduler {
  const debounceMs = options?.debounceMs ?? 150
  let timer: ReturnType<typeof setTimeout> | null = null

  return {
    schedule: () => {
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => {
        timer = null
        callback()
      }, debounceMs)
    },
    cancel: () => {
      if (!timer) return
      clearTimeout(timer)
      timer = null
    },
  }
}
