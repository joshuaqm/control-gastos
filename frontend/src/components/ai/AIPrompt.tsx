import { useState } from 'react'
import { Bot, Mic, Send } from 'lucide-react'

export default function AIPrompt({ onOpenChat }: { onOpenChat: (msg?: string) => void }) {
  const [val, setVal] = useState('')
  const [expanded, setExpanded] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && val.trim()) {
      onOpenChat(val)
      setVal('')
    }
  }

  return (
    <div
      className="glass rounded-2xl p-4 transition-all duration-300 relative overflow-hidden"
      style={{
        border: '1px solid rgba(124,58,237,0.3)',
        minHeight: expanded ? 120 : 72,
        boxShadow: val.length > 0 ? '0 0 30px rgba(124,58,237,0.2)' : 'none',
      }}
    >
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: 'linear-gradient(135deg, #7C3AED, #06D6A0)' }} />
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
          <Bot size={18} color="white" />
        </div>
        <textarea
          value={val}
          onChange={e => { setVal(e.target.value); setExpanded(e.target.value.length > 3) }}
          onKeyDown={handleKeyDown}
          placeholder="🗣️ ¿Qué quieres hacer hoy? Ej: 'Registra $200 en comida con BBVA'"
          rows={expanded ? 3 : 1}
          className="flex-1 bg-transparent text-sm resize-none"
          style={{ color: '#fff', outline: 'none', lineHeight: '1.5' }}
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: '#A0A0B8' }}>
            <Mic size={18} />
          </button>
          <button
            onClick={() => { if (val.trim()) { onOpenChat(val); setVal(''); setExpanded(false) } }}
            className="btn-primary p-2 rounded-xl"
            style={{ opacity: val.trim() ? 1 : 0.5 }}
          >
            <Send size={16} color="white" />
          </button>
        </div>
      </div>
    </div>
  )
}