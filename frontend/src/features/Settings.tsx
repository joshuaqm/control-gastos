import { ChevronRight, Download, Edit3 } from 'lucide-react'

const SETTINGS_ROWS: { label: string; sub: string }[] = [
  { label: 'Moneda', sub: 'Peso Mexicano (MXN)' },
  { label: 'Notificaciones', sub: 'Alertas de gastos y metas' },
  { label: 'Exportar Datos', sub: 'Descarga tu historial completo' },
  { label: 'Perfil', sub: 'Ana García · ana@ejemplo.com' },
  { label: 'Seguridad', sub: 'Contraseña y autenticación' },
]

export default function SettingsScreen({ darkMode, onToggleDark }: {
  darkMode: boolean
  onToggleDark: () => void
}) {
  return (
    <div className="flex flex-col gap-5 pb-6">
      <h2 className="text-xl font-bold">Configuración</h2>
      <div className="glass rounded-2xl divide-y divide-white/5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors cursor-pointer">
          <div>
            <p className="text-sm font-medium">Modo Oscuro</p>
            <p className="text-xs" style={{ color: '#6B6B85' }}>Cambiar apariencia de la app</p>
          </div>
          <button onClick={onToggleDark} className="w-10 h-6 rounded-full relative transition-all" style={{ background: darkMode ? '#7C3AED' : 'rgba(255,255,255,0.2)' }}>
            <div className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all" style={{ left: darkMode ? 22 : 2 }} />
          </button>
        </div>

        {SETTINGS_ROWS.map(row => (
          <div key={row.label} className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors cursor-pointer">
            <div>
              <p className="text-sm font-medium">{row.label}</p>
              <p className="text-xs" style={{ color: '#6B6B85' }}>{row.sub}</p>
            </div>
            {row.label === 'Moneda' && <span className="text-sm" style={{ color: '#A0A0B8' }}>MXN <ChevronRight size={14} className="inline" /></span>}
            {row.label === 'Notificaciones' && <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(6,214,160,0.15)', color: '#06D6A0' }}>Activas</span>}
            {row.label === 'Exportar Datos' && <Download size={16} style={{ color: '#A0A0B8' }} />}
            {row.label === 'Perfil' && <Edit3 size={16} style={{ color: '#A0A0B8' }} />}
            {row.label === 'Seguridad' && <ChevronRight size={16} style={{ color: '#A0A0B8' }} />}
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: '#A0A0B8' }}>VERSIÓN</p>
        <p className="text-sm">FinanceAI v1.0.0</p>
        <p className="text-xs mt-1" style={{ color: '#6B6B85' }}>Todos los derechos reservados © 2026</p>
      </div>
    </div>
  )
}