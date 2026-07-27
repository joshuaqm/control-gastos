import { NextResponse } from 'next/server'
import { parseVoiceInput } from '@/lib/ai'
import { createServerSupabase } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { texto } = body
    const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key')

    if (!texto?.trim()) {
      return NextResponse.json({ error: 'Texto vacío' }, { status: 400 })
    }

    let userId: string | null = null

    if (authHeader === process.env.WEBHOOK_SECRET) {
      const supabase = await createServerSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id || null
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      userId = user?.id || null
    } else {
      const supabase = await createServerSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id || null
    }

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const parsed = await parseVoiceInput(texto)

    const transactions = []
    for (const mov of parsed.movimientos) {
      const payload: Record<string, any> = {
        user_id: userId,
        fecha: mov.fecha || new Date().toISOString(),
        monto: mov.monto,
        moneda: mov.moneda || 'MXN',
        tipo: mov.tipo,
        categoria: mov.categoria,
        subcategoria: mov.subcategoria || null,
        descripcion: mov.descripcion || null,
        texto_original: texto,
        comercio: mov.comercio || null,
        ubicacion: mov.ubicacion || null,
        cuenta: mov.cuenta || null,
        metodo_pago: mov.metodo_pago || null,
        proyecto: mov.proyecto || null,
        viaje: mov.viaje || null,
        etiquetas: mov.etiquetas || [],
        persona_relacionada: mov.persona_relacionada || null,
        meses_total: mov.meses_total || null,
        meses_restantes: mov.meses_restantes || null,
        confianza: mov.confianza || null,
      }

      const { data, error } = await supabaseAdmin
        .from('transacciones')
        .insert(payload)
        .select()
        .single()

      if (error) {
        console.error('Insert error:', error)
        throw error
      }

      if (mov.tipo === 'compra_meses' && mov.meses_total && mov.meses_total > 1) {
        const pagoMensual = mov.monto / mov.meses_total
        for (let i = 1; i <= mov.meses_total; i++) {
          const fechaPago = new Date()
          fechaPago.setMonth(fechaPago.getMonth() + i)
          await supabaseAdmin.from('transacciones').insert({
            user_id: userId,
            fecha: fechaPago.toISOString(),
            monto: pagoMensual,
            moneda: mov.moneda || 'MXN',
            tipo: 'gasto',
            categoria: mov.categoria,
            descripcion: `Pago ${i}/${mov.meses_total} - ${mov.descripcion || ''}`,
            comercio: mov.comercio,
            persona_relacionada: mov.persona_relacionada,
            meses_total: mov.meses_total,
            meses_restantes: mov.meses_total - i,
            movimiento_recurrente: 'compra_meses',
            confianza: 0.9,
          })
        }
      }

      transactions.push(data)
    }

    return NextResponse.json({
      success: true,
      message: `${transactions.length} movimiento(s) registrado(s)`,
      transactions,
    })
  } catch (error) {
    console.error('Error processing voice:', error)
    return NextResponse.json(
      { error: 'Error al procesar el texto' },
      { status: 500 }
    )
  }
}
