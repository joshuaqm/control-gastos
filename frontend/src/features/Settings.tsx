import { useEffect, useState } from 'react'
import { Bell, Download, Save, Sun, User, Wallet } from 'lucide-react'
import { changePassword, fetchSettings, updateSettings } from '@/api/settings'
import { fetchTransactions } from '@/api/transactions'
import type { ShowToast } from '@/types'

const CURRENCIES = [
  { value: 'MXN', label: 'Peso Mexicano (MXN)' },
  { value: 'USD', label: 'Dólar (USD)' },
]

export default function SettingsScreen({
  darkMode,
  onToggleDark,
  onProfileChange,
  showToast,
}: {
  darkMode: boolean
  onToggleDark: () => void
  onProfileChange?: (username: string, email: string) => void
  showToast: ShowToast
}) {
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [currency, setCurrency] = useState('MXN')
  const [notifications, setNotifications] = useState(true)
  const [saving, setSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const [exporting, setExporting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const s = await fetchSettings()
      setUsername(s.username)
      setEmail(s.email)
      setMonthlyIncome(s.monthly_income != null ? s.monthly_income.toString() : '')
      setCurrency(s.currency || 'MXN')
      setNotifications(s.notifications_enabled)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cargar configuración', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-5 pb-6">
        <h2 className="text-xl font-bold">Configuración</h2>
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-purple-600 animate-spin" />
        </div>
      </div>
    )
  }

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      showToast('El nombre de usuario no puede estar vacío', 'error')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('Correo electrónico inválido', 'error')
      return
    }
    setSaving(true)
    try {
      const updated = await updateSettings({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        monthly_income: monthlyIncome ? Number(monthlyIncome) : null,
        currency,
        notifications_enabled: notifications,
      })
      onProfileChange?.(updated.username, updated.email)
      showToast('Configuración guardada', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleNotifications = async (value: boolean) => {
    setNotifications(value)
    try {
      await updateSettings({ notifications_enabled: value })
      showToast(value ? 'Notificaciones activadas' : 'Notificaciones desactivadas', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar', 'error')
      setNotifications(!value)
    }
  }

  const handleCurrency = async (value: string) => {
    setCurrency(value)
    try {
      await updateSettings({ currency: value })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar moneda', 'error')
    }
  }

  const handlePassword = async () => {
    if (!currentPassword) {
      showToast('Indica tu contraseña actual', 'error')
      return
    }
    if (newPassword.length < 6) {
      showToast('La nueva contraseña debe tener al menos 6 caracteres', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error')
      return
    }
    setPwSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast('Contraseña actualizada', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cambiar contraseña', 'error')
    } finally {
      setPwSaving(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const txns = await fetchTransactions()
      const header = 'id,fecha,descripcion,categoria,tipo,monto'
      const lines = txns.map(t =>
        [t.id, t.date ?? '', `"${(t.description || '').replace(/"/g, '""')}"`, t.category || '', t.type, t.amount].join(',')
      )
      const csv = [header, ...lines].join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'transacciones.csv'
      a.click()
      URL.revokeObjectURL(url)
      showToast('Exportación lista', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al exportar', 'error')
    } finally {
      setExporting(false)
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
  }
  const labelStyle = { color: '#A0A0B8' }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <h2 className="text-xl font-bold">Configuración</h2>

      {/* Modo oscuro */}
      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun size={16} style={{ color: '#F59E0B' }} />
            <div>
              <p className="text-sm font-medium">Modo Oscuro</p>
              <p className="text-xs" style={{ color: '#6B6B85' }}>Cambiar apariencia de la app</p>
            </div>
          </div>
          <button onClick={onToggleDark} className="w-10 h-6 rounded-full relative transition-all" style={{ background: darkMode ? '#7C3AED' : 'rgba(255,255,255,0.2)' }}>
            <div className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all" style={{ left: darkMode ? 22 : 2 }} />
          </button>
        </div>
      </div>

      {/* Perfil */}
      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 mb-4">
          <User size={16} style={{ color: '#A78BFA' }} />
          <h3 className="text-sm font-semibold">Perfil</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Nombre de usuario</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Correo electrónico</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={inputStyle}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Ingreso mensual (MXN)</label>
            <input
              value={monthlyIncome}
              onChange={e => setMonthlyIncome(e.target.value)}
              type="number"
              min="0"
              placeholder="15000"
              className="w-full px-4 py-3 rounded-xl text-sm font-mono"
              style={inputStyle}
            />
            <p className="text-[11px] mt-1" style={{ color: '#6B6B85' }}>Base para calcular los presupuestos 50/30/20</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Moneda</label>
            <select
              value={currency}
              onChange={e => handleCurrency(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            >
              {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff' }}
        >
          <Save size={14} />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {/* Notificaciones */}
      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell size={16} style={{ color: '#06D6A0' }} />
            <div>
              <p className="text-sm font-medium">Notificaciones</p>
              <p className="text-xs" style={{ color: '#6B6B85' }}>Recordatorios de cobros, metas y rendimientos</p>
            </div>
          </div>
          <button onClick={() => handleNotifications(!notifications)} className="w-10 h-6 rounded-full relative transition-all" style={{ background: notifications ? '#06D6A0' : 'rgba(255,255,255,0.2)' }}>
            <div className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all" style={{ left: notifications ? 22 : 2 }} />
          </button>
        </div>
      </div>

      {/* Seguridad */}
      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 mb-4">
          <Wallet size={16} style={{ color: '#F59E0B' }} />
          <h3 className="text-sm font-semibold">Seguridad</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Contraseña actual</label>
            <input
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              type="password"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Nueva contraseña</label>
            <input
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              type="password"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Confirmar nueva</label>
            <input
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              type="password"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={inputStyle}
            />
          </div>
        </div>
        <button
          onClick={handlePassword}
          disabled={pwSaving}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}
        >
          <Save size={14} />
          {pwSaving ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </div>

      {/* Exportar */}
      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download size={16} style={{ color: '#A0A0B8' }} />
            <div>
              <p className="text-sm font-medium">Exportar Datos</p>
              <p className="text-xs" style={{ color: '#6B6B85' }}>Descarga tu historial de transacciones en CSV</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#A0A0B8', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Download size={14} />
            {exporting ? 'Exportando…' : 'Exportar'}
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: '#A0A0B8' }}>VERSIÓN</p>
        <p className="text-sm">FinanceAI v1.0.0</p>
        <p className="text-xs mt-1" style={{ color: '#6B6B85' }}>Todos los derechos reservados © 2026</p>
      </div>
    </div>
  )
}