import { useCallback, useRef, useState } from 'react'
import type { Toast, ToastKind } from '@/types'

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const showToast = useCallback((msg: string, kind: ToastKind = 'info') => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, msg, kind }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, showToast, dismiss }
}