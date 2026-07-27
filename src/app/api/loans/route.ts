import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data } = await supabaseAdmin
      .from('prestamos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ loans: data || [] })
  } catch (error) {
    console.error('Error fetching loans:', error)
    return NextResponse.json({ error: 'Error al obtener préstamos' }, { status: 500 })
  }
}
