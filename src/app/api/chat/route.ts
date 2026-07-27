import { NextResponse } from 'next/server'
import { chatQuery } from '@/lib/ai'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { pregunta } = body

    if (!pregunta?.trim()) {
      return NextResponse.json({ error: 'Pregunta vacía' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const currentMonth = new Date().toISOString().slice(0, 7)

    const [ingresos, gastos, ultimosMovs, prestamos, totalCount] = await Promise.all([
      supabaseAdmin.from('transacciones').select('monto').eq('user_id', user.id).eq('tipo', 'ingreso').gte('fecha', `${currentMonth}-01`),
      supabaseAdmin.from('transacciones').select('monto').eq('user_id', user.id).in('tipo', ['gasto', 'compra_meses']).gte('fecha', `${currentMonth}-01`),
      supabaseAdmin.from('transacciones').select('*').eq('user_id', user.id).order('fecha', { ascending: false }).limit(20),
      supabaseAdmin.from('prestamos').select('*').eq('user_id', user.id),
      supabaseAdmin.from('transacciones').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    const totalIngresos = ingresos.data?.reduce((s, t) => s + Number(t.monto), 0) || 0
    const totalGastos = gastos.data?.reduce((s, t) => s + Number(t.monto), 0) || 0

    const resumen = [
      `Total de transacciones: ${totalCount.count || 0}`,
      `Este mes (${currentMonth}): Ingresos $${totalIngresos}, Gastos $${totalGastos}`,
      `Préstamos pendientes: ${prestamos.data?.length || 0}`,
    ].join('\n')

    const ultimosMovimientos = (ultimosMovs.data || [])
      .slice(0, 10)
      .map(t => `- ${t.fecha?.slice(0, 10)} | ${t.tipo} | $${t.monto} | ${t.categoria} | ${t.descripcion || ''}`)
      .join('\n')

    const respuesta = await chatQuery(pregunta, { resumen, ultimosMovimientos })

    return NextResponse.json({ respuesta })
  } catch (error) {
    console.error('Error in chat:', error)
    return NextResponse.json(
      { error: 'Error al procesar la pregunta' },
      { status: 500 }
    )
  }
}
