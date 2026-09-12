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
      style={{ background: 'var(--modal-backdrop)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="glass animate-slide-up rounded-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col"
        style={{ border: '1px solid rgba(124,58,237,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} style={{ color: 'var(--text-3)' }}>
            <X size={20} />
          </button>
        </div>
        <div
          className="flex-1 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--text-2)' }}
        >
          {content}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
