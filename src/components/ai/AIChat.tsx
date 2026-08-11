import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Check, Send } from 'lucide-react'
import type { ChatCard, ChatMsg } from '@/types'
import { fmt } from '@/utils/format'

type AiResponse = ChatCard & { text: string }

const aiResponses: Record<string, AiResponse> = {
  default: { text: 'Entendido. He procesado tu solicitud. ¿Hay algo más en lo que pueda ayudarte?', type: 'info', data: {} },
  gasto: { text: '¡Listo! He registrado el gasto exitosamente.', type: 'confirm', data: { concepto: 'Comida', monto: '$200', cuenta: 'BBVA', fecha: 'Hoy' } },
  resumen: { text: 'Aquí tienes tu resumen del mes de Agosto:', type: 'summary', data: { ingresos: 5200, gastos: 3420, ahorro: 1780, balance: '+$1,780' } },
  presupuesto: { text: 'Así vas con tu presupuesto este mes:', type: 'budget', data: { necesidades: '81%', deseos: '67%', ahorro: '75%' } },
}

const budgetRows = [
  { key: 'necesidades', label: '🏠 Necesidades', color: '#3B82F6' },
  { key: 'deseos', label: '🎯 Deseos', color: '#F59E0B' },
  { key: 'ahorro', label: '💰 Ahorro', color: '#06D6A0' },
]

function resolveResponse(text: string): AiResponse {
  const lower = text.toLowerCase()
  if (lower.includes('gasto') || lower.includes('registra') || lower.includes('comida') || lower.includes('gasolina')) {
    return aiResponses.gasto
  }
  if (lower.includes('resumen') || lower.includes('cuánto') || lower.includes('cuanto')) {
    return aiResponses.resumen
  }
  if (lower.includes('presupuesto') || lower.includes('progreso')) {
    return aiResponses.presupuesto
  }
  return aiResponses.default
}

function MessageCard({ card }: { card?: ChatCard }) {
  if (!card) return null
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
      {card.type === 'confirm' && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <Check size={14} style={{ color: '#06D6A0' }} />
            <span className="text-xs font-semibold" style={{ color: '#06D6A0' }}>Gasto registrado</span>
          </div>
          {Object.entries(card.data).map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span className="capitalize" style={{ color: '#A0A0B8' }}>{k}</span>
              <span className="font-mono font-medium">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
      {card.type === 'summary' && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold mb-1" style={{ color: '#A78BFA' }}>Resumen Agosto</p>
          <div className="flex justify-between text-xs">
            <span style={{ color: '#06D6A0' }}>Ingresos</span>
            <span className="font-mono">{fmt(Number(card.data.ingresos))}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: '#EF4444' }}>Gastos</span>
            <span className="font-mono">{fmt(Number(card.data.gastos))}</span>
          </div>
          <div className="flex justify-between text-xs font-semibold mt-1 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <span>Ahorro neto</span>
            <span className="font-mono" style={{ color: '#06D6A0' }}>{String(card.data.balance)}</span>
          </div>
        </div>
      )}
      {card.type === 'budget' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold mb-1" style={{ color: '#A78BFA' }}>Estado del Presupuesto</p>
          {budgetRows.map(({ key, label, color }) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span>{label}</span>
                <span style={{ color }} className="font-mono">{String(card.data[key])}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full" style={{ width: String(card.data[key]), background: color }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AIChat({ initialMsg = '', visible = true }: {
  initialMsg?: string
  visible?: boolean
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 0, from: 'ai', text: '¡Hola Ana! Soy tu asistente financiero. Puedo ayudarte a registrar gastos, revisar tu presupuesto, consultar tus deudas y mucho más. ¿En qué te ayudo hoy?' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastMsgRef = useRef('')

  const sendMessage = useCallback((text: string) => {
    const userMsg: ChatMsg = { id: Date.now(), from: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    const response = resolveResponse(text)

    setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        from: 'ai',
        text: response.text,
        card: response.type !== 'info' ? { type: response.type, data: response.data } : undefined,
      }])
    }, 1200)
  }, [])

  useEffect(() => {
    if (initialMsg && initialMsg !== lastMsgRef.current) {
      lastMsgRef.current = initialMsg
      sendMessage(initialMsg)
    }
  }, [initialMsg, sendMessage])

  useEffect(() => {
    if (visible) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing, visible])

  return (
    <div
      className="glass rounded-2xl flex-col overflow-hidden w-full chat-view"
      style={{
        display: visible ? 'flex' : 'none',
        border: '1px solid rgba(124,58,237,0.3)',
      }}
    >
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
          <Bot size={18} color="white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Asistente Financiero IA</p>
          <p className="text-xs" style={{ color: '#06D6A0' }}>● En línea</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-2 ${msg.from === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.from === 'ai' && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
                  <Bot size={14} color="white" />
                </div>
              )}
              <div className="flex flex-col gap-2 max-w-[80%]">
                <div
                  className="px-3 py-2.5 rounded-2xl text-sm"
                  style={msg.from === 'user'
                    ? { background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff', borderBottomRightRadius: 4 }
                    : { background: 'rgba(255,255,255,0.06)', color: '#E0E0F0', borderBottomLeftRadius: 4 }
                  }
                >
                  {msg.text}
                </div>
                <MessageCard card={msg.card} />
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
                <Bot size={14} color="white" />
              </div>
              <div className="px-3 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#7C3AED', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && input.trim()) sendMessage(input) }}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-3 py-2 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
            <button
              onClick={() => input.trim() && sendMessage(input)}
              className="btn-primary p-2 rounded-xl"
              style={{ opacity: input.trim() ? 1 : 0.5 }}
            >
              <Send size={15} color="white" />
            </button>
          </div>
        </div>
    </div>
  )
}