'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiFetch, apiPost, getHeaders } from '@/lib/api'
import { UserPlus, Loader2, Trash2, Shield, User as UserIcon } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', nombre: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    try {
      const data = await apiFetch<{ users: any[] }>('/api/admin/users')
      setUsers(data.users || [])
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    try {
      await apiPost('/api/admin/users', {
        email: form.email,
        password: form.password,
        nombre: form.nombre,
      })
      toast.success(`Usuario ${form.email} creado`)
      setForm({ email: '', password: '', nombre: '' })
      setShowForm(false)
      loadUsers()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`¿Eliminar a ${email}?`)) return
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      toast.success(`Usuario ${email} eliminado`)
      loadUsers()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (error === 'Solo administradores' || error === 'No autorizado') {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-60 flex items-center justify-center">
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Acceso solo para administradores</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-60 p-6 space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold">Administración</h1>
            <p className="text-muted-foreground">Gestiona los usuarios autorizados</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            Invitar usuario
          </button>
        </div>

        {showForm && (
          <Card className="animate-slide-up">
            <CardContent className="p-4">
              <form onSubmit={createUser} className="space-y-3">
                <input
                  type="email"
                  placeholder="Correo del nuevo usuario"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border bg-secondary/50"
                  required
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Nombre (opcional)"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg border bg-secondary/50"
                  />
                  <input
                    type="password"
                    placeholder="Contraseña temporal"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg border bg-secondary/50"
                    required
                    minLength={6}
                  />
                </div>
                <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">
                  Crear usuario
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Usuarios ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${u.role === 'admin' ? 'bg-primary/10' : 'bg-secondary'}`}>
                        {u.role === 'admin' ? (
                          <Shield className="h-4 w-4 text-primary" />
                        ) : (
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{u.nombre || u.email}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {u.role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => deleteUser(u.id, u.email)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
