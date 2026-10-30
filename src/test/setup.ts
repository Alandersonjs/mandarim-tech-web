import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// The live contract test runs in the node environment, where there is no DOM to prepare.
const hasDom = typeof window !== 'undefined'

afterEach(() => {
  if (!hasDom) return
  cleanup()
  localStorage.clear()
})

if (hasDom) {
  // jsdom does not implement media playback nor object URLs.
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: vi.fn(() => 'blob:mock-audio') })
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: vi.fn() })
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
  })
  Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', { writable: true, value: vi.fn() })

  // jsdom has no layout engine: scrolling helpers must exist but do nothing.
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
}
