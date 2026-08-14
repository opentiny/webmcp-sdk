import { test, vi, expect } from 'vitest'

const mock1 = vi.fn()
const mock2 = vi.fn()

mock1()
mock2()

console.log(mock1.mock.invocationCallOrder[0], mock2.mock.invocationCallOrder[0])
