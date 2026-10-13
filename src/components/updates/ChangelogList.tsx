import { Sparkles, Wrench } from 'lucide-react'
import { CHANGELOG, type ChangeItem, type Release } from '@/data/changelog'

export function ChangeItemRow({ item }: { item: ChangeItem }) {
  const isFix = item.kind === 'fix'
  const Icon = isFix ? Wrench : Sparkles
  const color = isFix ? '#F59E0B' : '#06D6A0'
  return (
    <div className="flex gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${color}22`, color }}
      >
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{item.title}</p>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: `${color}22`, color }}
          >
            {isFix ? 'Corrección' : 'Novedad'}
          </span>
        </div>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-3)' }}>
          {item.description}
        </p>
      </div>
    </div>
  )
}

export default function ChangelogList({
  releases = CHANGELOG,
  compact = false,
}: {
  releases?: Release[]
  compact?: boolean
}) {
  return (
    <div className="flex flex-col gap-6">
      {releases.map(release => (
        <div key={release.version} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(124,58,237,0.18)', color: '#A78BFA' }}
            >
              v{release.version}
            </span>
            <p className="text-sm font-semibold">{release.title}</p>
            <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              {new Date(`${release.date}T00:00:00`).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
          {!compact && (
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>
              {release.summary}
            </p>
          )}
          <div className="flex flex-col gap-4">
            {release.items.map(item => (
              <ChangeItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
