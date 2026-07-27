import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const MODEL = 'gemini-2.0-flash-lite'

const movimientoItem = {
  type: SchemaType.OBJECT,
  properties: {
    tipo: { type: SchemaType.STRING, description: 'gasto, ingreso, transferencia, prestamo_otorgado, prestamo_recibido, pago_deuda, abono_tarjeta, compra_meses, actualizacion_saldo' },
    monto: { type: SchemaType.NUMBER, description: 'Monto numérico' },
    moneda: { type: SchemaType.STRING, description: 'MXN, USD, EUR' },
    fecha: { type: SchemaType.STRING, description: 'Fecha ISO o null' },
    categoria: { type: SchemaType.STRING, description: 'Categoría' },
    subcategoria: { type: SchemaType.STRING },
    descripcion: { type: SchemaType.STRING },
    comercio: { type: SchemaType.STRING },
    ubicacion: { type: SchemaType.STRING },
    cuenta: { type: SchemaType.STRING },
    metodo_pago: { type: SchemaType.STRING },
    proyecto: { type: SchemaType.STRING },
    viaje: { type: SchemaType.STRING },
    etiquetas: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    persona_relacionada: { type: SchemaType.STRING },
    meses_total: { type: SchemaType.NUMBER },
    meses_restantes: { type: SchemaType.NUMBER },
    confianza: { type: SchemaType.NUMBER, description: '0.0 a 1.0' },
  },
  required: ['tipo', 'monto', 'categoria'],
}

async function generateWithFallback(modelName: string, systemInstruction: string, prompt: string, generationConfig?: any) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction, generationConfig })
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (err: any) {
    if (err?.status === 429 || err?.message?.includes('429')) {
      throw new Error('La IA está temporalmente sin disponibilidad. Intenta de nuevo en unos segundos.')
    }
    throw err
  }
}

export async function parseVoiceInput(text: string) {
  const text_response = await generateWithFallback(MODEL,
    `Eres un asistente financiero experto en interpretar lenguaje natural y convertirlo en transacciones financieras estructuradas.

Reglas:
1. Interpreta frases como "gasté X en Y" como gasto, "me pagaron X" como ingreso, "le presté X a Y" como préstamo otorgado, "me prestó X" como préstamo recibido.
2. Detecta MÚLTIPLES movimientos en una misma frase (ej: "gasté 250 en Uber y luego 120 en comida" → 2 movimientos).
3. Para compras a meses: detecta "a X meses" y pon meses_total.
4. Para transferencias: detecta "transferí", "deposité", "moví".
5. Para pagos de tarjeta: detecta "pagué la tarjeta", "abono a tarjeta".
6. Moneda por defecto: MXN a menos que se especifique otra.
7. Si hay personas involucradas, identifícalas en persona_relacionada.
8. Fecha: usa la fecha actual si no se especifica otra.
9. Confianza: 0.0 a 1.0 basado en qué tan clara es la información.
10. Cuenta por defecto: "Efectivo" si no se especifica.`,
    `Interpreta esta frase y extrae todos los movimientos financieros: "${text}"`,
    {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          movimientos: { type: SchemaType.ARRAY, items: movimientoItem },
        },
        required: ['movimientos'],
      },
    }
  )

  try {
    return JSON.parse(text_response) as { movimientos: any[] }
  } catch {
    throw new Error('Error al interpretar la respuesta de la IA')
  }
}

export async function chatQuery(question: string, context: { resumen: string; ultimosMovimientos: string }) {
  return generateWithFallback(MODEL,
    `Eres un asistente financiero personal. Responde preguntas sobre finanzas personales basándote en los datos del usuario.

Contexto actual:
${context.resumen}

Últimos movimientos:
${context.ultimosMovimientos}

Sé conciso, preciso y amigable. Usa números reales. Si no tienes datos suficientes, dilo claramente.`,
    question,
    { temperature: 0.3 }
  )
}

export async function generateInsights(summary: {
  gastosPorCategoria: { categoria: string; total: number }[]
  gastosPorMes: { mes: string; total: number }[]
  ingresosPorMes: { mes: string; total: number }[]
  prestamosPendientes: { persona: string; saldo: number }[]
  comprasMeses: { descripcion: string; monto: number; mesesRestantes: number }[]
  suscripciones: { descripcion: string; monto: number }[]
  promediosDiarios: { dia: string; promedio: number }[]
}) {
  try {
    const text = await generateWithFallback(MODEL,
      `Eres un analista financiero. Genera insights personalizados basados en datos reales del usuario. Cada insight debe ser específico, accionable y basado en los datos proporcionados. No des consejos genéricos. Usa números y comparaciones reales.`,
      `Datos:\n${JSON.stringify(summary, null, 2)}`,
      {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            insights: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  tipo: { type: SchemaType.STRING, description: 'alerta, oportunidad, tendencia, recordatorio' },
                  mensaje: { type: SchemaType.STRING },
                  severidad: { type: SchemaType.STRING, description: 'baja, media, alta' },
                },
                required: ['tipo', 'mensaje', 'severidad'],
              },
            },
          },
          required: ['insights'],
        },
      }
    )
    return JSON.parse(text) as { insights: { tipo: string; mensaje: string; severidad: string }[] }
  } catch {
    return { insights: [] }
  }
}
