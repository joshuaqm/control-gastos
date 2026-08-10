import { useCallback, useEffect, useState } from 'react'
import { fetchAccounts } from '@/api/accounts'
import { fetchTransactions } from '@/api/transactions'
import { fetchRecurring } from '@/api/recurring'
import { fetchSettings } from '@/api/settings'
import {
  creditReminders,
  interestReminders,
  recurringReminders,
  type Reminder,
} from '@/utils/dashboardCalc'

const READ_KEY = 'financeai.notif.read'

function loadRead(): string[] {
  try {
    const raw = localStorage.getItem(READ_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

export function useNotifications() {
  const [open, setOpen] = useState(false)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [readIds, setReadIds] = useState<string[]>(loadRead)
  const [loading, setLoading] = useState(false)
  const [enabled, setEnabled] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [settings, accounts, txns, recurring] = await Promise.all([
        fetchSettings(),
        fetchAccounts(),
        fetchTransactions(),
        fetchRecurring(),
      ])
      setEnabled(settings.notifications_enabled)
      if (!settings.notifications_enabled) {
        setReminders([])
        return
      }
      const all: Reminder[] = [
        ...creditReminders(accounts, txns),
        ...recurringReminders(recurring, txns),
        ...interestReminders(accounts, txns),
      ]
        .sort((a, b) => a.days - b.days)
        .slice(0, 8)
      setReminders(all)
    } catch {
      setReminders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void refresh()
  }, [open, refresh])

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