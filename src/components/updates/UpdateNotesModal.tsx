import { ArrowRight, X } from 'lucide-react'
import ChangelogList from '@/components/updates/ChangelogList'
import { CHANGELOG, CHANGELOG_VERSION } from '@/data/changelog'

export default function UpdateNotesModal({
  open,
  onClose,
  onViewMore,
}: {
  open: boolean
  onClose: () => void
  onViewMore: () => void
}) {
  if (!open) return null

  const latest = CHANGELOG[0]
  const total = latest?.items.length ?? 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'var(--modal-backdrop)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="glass animate-slide-up rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col"
        style={{ border: '1px solid rgba(124,58,237,0.2)' }}
      >
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}
            >
              <span className="text-lg">✨</span>
            </div>
            <div>
              <h3 className="text-lg font-bold">Novedades</h3>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                Versión {CHANGELOG_VERSION} · {total} cambios
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-3)' }} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <ChangelogList />
        </div>

        <div className="p-6 pt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="order-2 sm:order-1 flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}
          >
            Descartar
          </button>
          <button
            onClick={onViewMore}
            className="order-1 sm:order-2 btn-primary flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            Ver detalles <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
