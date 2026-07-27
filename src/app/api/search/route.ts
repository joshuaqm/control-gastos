import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')

    if (!q?.trim()) {
      return NextResponse.json({ transactions: [] })
    }

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const term = `%${q}%`

    const { data } = await supabaseAdmin
      .from('transacciones')
      .select('*')
      .eq('user_id', user.id)
      .or(
        `descripcion.ilike.${term},categoria.ilike.${term},comercio.ilike.${term},persona_relacionada.ilike.${term},cuenta.ilike.${term},texto_original.ilike.${term},viaje.ilike.${term},proyecto.ilike.${term}`
      )
      .order('fecha', { ascending: false })
      .limit(50)

    return NextResponse.json({ transactions: data || [] })
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json({ error: 'Error al buscar' }, { status: 500 })
  }
}
