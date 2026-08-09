import { AlertCircle, Check, Info } from 'lucide-react'
import type { Toast } from '@/types'

const KIND_STYLES: Record<Toast['kind'], { border: string; color: string }> = {
  success: { border: 'rgba(6,214,160,0.4)', color: '#06D6A0' },
  error: { border: 'rgba(239,68,68,0.4)', color: '#EF4444' },
  info: { border: 'rgba(59,130,246,0.4)', color: '#3B82F6' },
}

export default function Toast({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => {
        const style = KIND_STYLES[t.kind]
        const Icon = t.kind === 'success' ? Check : t.kind === 'error' ? AlertCircle : Info
        return (
          <div
            key={t.id}
            className="animate-slide-up flex items-center gap-3 px-4 py-3 rounded-xl glass text-sm font-medium cursor-pointer"
            style={{ borderColor: style.border, color: style.color }}
            onClick={() => dismiss(t.id)}
          >
            <Icon size={16} />
            {t.msg}
          </div>
        )
      })}
    </div>
  )
}