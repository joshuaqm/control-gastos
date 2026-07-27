import { NextResponse } from 'next/server'
import { generateInsights } from '@/lib/ai'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const currentMonth = new Date().toISOString().slice(0, 7)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7)

    const [gastosCat, prestamosPendientes, comprasMeses] = await Promise.all([
      supabaseAdmin.from('transacciones').select('categoria, monto').eq('user_id', user.id).in('tipo', ['gasto', 'compra_meses']).gte('fecha', `${currentMonth}-01`),
      supabaseAdmin.from('prestamos').select('persona, saldo_pendiente').eq('user_id', user.id).gt('saldo_pendiente', 0),
      supabaseAdmin.from('transacciones').select('descripcion, monto, meses_restantes').eq('user_id', user.id).eq('tipo', 'compra_meses').gt('meses_restantes', 0),
    ])

    const summary = {
      gastosPorCategoria: (gastosCat.data || []).reduce((acc: any[], t: any) => {
        const existing = acc.find(a => a.categoria === t.categoria)
        if (existing) existing.total += Number(t.monto)
        else acc.push({ categoria: t.categoria, total: Number(t.monto) })
        return acc
      }, []),
      gastosPorMes: [],
      ingresosPorMes: [],
      prestamosPendientes: (prestamosPendientes.data || []).map(p => ({ persona: p.persona, saldo: Number(p.saldo_pendiente) })),
      comprasMeses: (comprasMeses.data || []).map((c: any) => ({ descripcion: c.descripcion, monto: Number(c.monto), mesesRestantes: c.meses_restantes })),
      suscripciones: [],
      promediosDiarios: [],
    }

    const result = await generateInsights(summary)
    return NextResponse.json({ insights: result.insights })
  } catch (error) {
    console.error('Error generating insights:', error)
    return NextResponse.json({ error: 'Error al generar insights' }, { status: 500 })
  }
}
