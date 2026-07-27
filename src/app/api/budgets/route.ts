import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const currentMonth = new Date().toISOString().slice(0, 7)
    const [year, month] = currentMonth.split('-').map(Number)

    const { data } = await supabaseAdmin
      .from('presupuestos')
      .select('*')
      .eq('user_id', user.id)
      .eq('mes', month)
      .eq('año', year)

    return NextResponse.json({ budgets: data || [] })
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json({ error: 'Error al obtener presupuestos' }, { status: 500 })
  }
}
