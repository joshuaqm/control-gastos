import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchAccounts } from '@/api/accounts'
import { fetchTransactions } from '@/api/transactions'
import { fetchRecurring } from '@/api/recurring'
import { fetchDebts } from '@/api/debts'
import { fetchSettings } from '@/api/settings'
import {
  creditReminders,
  debtReminders,
  interestReminders,
  recurringReminders,
  type Reminder,
} from '@/utils/dashboardCalc'

const READ_KEY = 'financeai.notif.read'
const NOTIFIED_KEY = 'financeai.notif.notified'

function loadRead(): string[] {
  try {
    const raw = localStorage.getItem(READ_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function loadNotified(): string[] {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function saveNotified(ids: string[]) {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(ids))
  } catch { /* ignore */ }
}

const DAYS_LABEL = (days: number) =>
  days < 0 ? `Atrasado ${Math.abs(days)} día(s)` : days === 0 ? 'Vence hoy' : `Vence en ${days} día(s)`

async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function showBrowserNotification(reminder: Reminder) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const body = `${reminder.subtitle}${reminder.amount > 0 ? ` · ${fmt(reminder.amount)}` : ''} · ${DAYS_LABEL(reminder.days)}`
  try {
    new Notification(reminder.title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: reminder.id,
    })
  } catch { /* ignore */ }
}

function fmt(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

export function useNotifications() {
  const [open, setOpen] = useState(false)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [readIds, setReadIds] = useState<string[]>(loadRead)
  const [loading, setLoading] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const initialFetchDone = useRef(false)
  const notifiedRef = useRef<string[]>(loadNotified())

  const notifyBrowser = useCallback((all: Reminder[]) => {
    const urgent = all.filter(r => r.days <= 0)
    if (urgent.length === 0) return

    const notified = notifiedRef.current
    const newOnes = urgent.filter(r => !notified.includes(r.id))
    if (newOnes.length === 0) return

    void requestNotificationPermission().then(granted => {
      if (!granted) return
      for (const r of newOnes) {
        showBrowserNotification(r)
      }
      notifiedRef.current = [...notified, ...newOnes.map(r => r.id)]
      saveNotified(notifiedRef.current)
    })
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [settings, accounts, txns, recurring, debts] = await Promise.all([
        fetchSettings(),
        fetchAccounts(),
        fetchTransactions(),
        fetchRecurring(),
        fetchDebts(),
      ])
      setEnabled(settings.notifications_enabled)
      if (!settings.notifications_enabled) {
        setReminders([])
        return
      }
      const all: Reminder[] = [
        ...creditReminders(accounts, txns),
        ...recurringReminders(recurring, txns),
        ...debtReminders(debts),
        ...interestReminders(accounts, txns),
      ]
        .sort((a, b) => a.days - b.days)
        .slice(0, 8)
      setReminders(all)
      notifyBrowser(all)
    } catch {
      setReminders([])
    } finally {
      setLoading(false)
    }
  }, [notifyBrowser])

  useEffect(() => {
    if (open) void refresh()
  }, [open, refresh])

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true
      void refresh()
    }
  }, [refresh])

  const toggle = () => setOpen(v => !v)
  const close = () => setOpen(false)

  const unread = reminders.filter(r => !readIds.includes(r.id))

  const markAllRead = useCallback(() => {
    setReadIds(prev => {
      const next = Array.from(new Set([...prev, ...reminders.map(r => r.id)]))
      try {
        localStorage.setItem(READ_KEY, JSON.stringify(next))
      } catch { /* ignore */ }
      return next
    })
  }, [reminders])

  const markOneRead = useCallback((id: string) => {
    setReadIds(prev => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      try {
        localStorage.setItem(READ_KEY, JSON.stringify(next))
      } catch { /* ignore */ }
      return next
    })
  }, [])

  return {
    open,
    toggle,
    close,
    reminders,
    unreadCount: unread.length,
    enabled,
    loading,
    markAllRead,
    markOneRead,
  }
}

export type NotificationsController = ReturnType<typeof useNotifications>