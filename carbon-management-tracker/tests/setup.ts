import { vi } from 'vitest'

// Tests never reach the real network; ones that need a response stub fetch themselves
vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Network disabled in tests'))))
