import { X } from 'lucide-react'

export default function LegalModal({
  open,
  title,
  content,
  onClose,
}: {
  open: boolean
  title: string
  content: string
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="glass animate-slide-up rounded-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col"
        style={{ border: '1px solid rgba(124,58,237,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} style={{ color: '#6B6B85' }}>
            <X size={20} />
          </button>
        </div>
        <div
          className="flex-1 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap"
          style={{ color: '#A0A0B8' }}
        >
          {content}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#A0A0B8' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
