import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('q')
    const tipo = searchParams.get('tipo')
    const categoria = searchParams.get('categoria')
    const persona = searchParams.get('persona')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let query = supabaseAdmin
      .from('transacciones')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })

    if (search) {
      const term = `%${search}%`
      query = query.or(
        `descripcion.ilike.${term},categoria.ilike.${term},comercio.ilike.${term},persona_relacionada.ilike.${term},cuenta.ilike.${term},texto_original.ilike.${term},viaje.ilike.${term},proyecto.ilike.${term}`
      )
    }

    if (tipo) query = query.eq('tipo', tipo)
    if (categoria) query = query.eq('categoria', categoria)
    if (persona) query = query.eq('persona_relacionada', persona)
    if (from) query = query.gte('fecha', from)
    if (to) query = query.lte('fecha', to)

    const { data, count } = await query.range(offset, offset + limit - 1)

    return NextResponse.json({ transactions: data || [], total: count })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Error al obtener transacciones' },
      { status: 500 }
    )
  }
}
