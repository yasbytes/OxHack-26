import { useSyncExternalStore } from 'react'

// One short message at a time, shown by <Toast /> in App
let message: { text: string; id: number } | null = null
let hideTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function showToast(text: string) {
  message = { text, id: Date.now() }
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    message = null
    emit()
  }, 2500)
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useToast() {
  return useSyncExternalStore(subscribe, () => message)
}
