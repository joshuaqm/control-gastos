import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerSupabase } from '@/lib/supabase-server'

async function checkAdmin(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Usar server client (con sesión) para consultar profiles respetando RLS
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return null
  return user
}

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const user = await checkAdmin(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    return NextResponse.json({ users: profiles || [] })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const user = await checkAdmin(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }

    const { email, password, nombre } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
    }

    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre: nombre || email.split('@')[0] },
    })

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Usuario ${email} creado exitosamente`,
      user: { id: newUser.user?.id, email },
    })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear usuario' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const user = await checkAdmin(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }

    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }
    if (userId === user.id) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error

    return NextResponse.json({ success: true, message: 'Usuario eliminado' })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: error.message || 'Error al eliminar usuario' }, { status: 500 })
  }
}
