import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RiMessage3Line,
  RiSendPlane2Line,
  RiCloseLine,
  RiLoader4Line,
  RiBrainLine
} from 'react-icons/ri'

interface AIChatPanelProps {
  title: string
  initialMessage: string
  onGenerate: (prompt: string, addMessage: (role: 'ai' | 'user', text: string) => void) => Promise<void>
  icon?: React.ReactNode
  contextInfo?: string
}

const AIChatPanel = ({ title, initialMessage, onGenerate, icon, contextInfo }: AIChatPanelProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatPrompt, setChatPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: 'ai', text: initialMessage }
  ])

  const addMessage = (role: 'ai' | 'user', text: string) => {
    setChatMessages(prev => [...prev, { role, text }])
  }

  const handleAction = async () => {
    if (!chatPrompt.trim() || isGenerating) return
    
    const userMsg = chatPrompt
    addMessage('user', userMsg)
    setChatPrompt('')
    setIsGenerating(true)

    try {
      await onGenerate(userMsg, addMessage)
    } catch (err: any) {
      addMessage('ai', `âš ï¸ Error: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end transition-all duration-300 ${isChatOpen ? 'w-[380px]' : 'w-12'}`}>
      <AnimatePresence>
        {!isChatOpen ? (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsChatOpen(true)}
            className="w-12 h-12 rounded-full bg-violet-600 border border-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center justify-center text-white hover:scale-110 transition-transform cursor-pointer"
          >
            <RiMessage3Line size={20} />
          </motion.button>
        ) : (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="w-full h-[500px] bg-[#0a0a12]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
          >
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                {icon || <RiBrainLine size={16} className="text-violet-400" />}
                <span className="text-[11px] font-black tracking-widest text-zinc-300 uppercase">{title}</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                <RiCloseLine size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-none">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-violet-600/20 border border-violet-500/20 text-zinc-200' 
                      : 'bg-white/[0.03] border border-white/[0.06] text-zinc-400'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.03] border border-white/[0.06] px-3 py-2 rounded-xl flex items-center gap-2">
                    <RiLoader4Line size={12} className="animate-spin text-violet-500" />
                    <span className="text-[10px] text-zinc-500 font-mono italic">Processing Context...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-white/[0.05] bg-black/20">
              <div 
                className="relative flex items-center bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 focus-within:border-violet-500/40 transition-colors"
                onKeyDown={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') handleAction()
                  }}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-transparent border-none outline-none text-[11px] text-zinc-200 placeholder:text-zinc-700"
                />
                <button 
                  onClick={handleAction}
                  disabled={!chatPrompt.trim() || isGenerating}
                  className={`ml-2 p-1.5 rounded-lg transition-all ${
                    !chatPrompt.trim() || isGenerating 
                      ? 'text-zinc-700' 
                      : 'text-violet-400 hover:bg-violet-500/10'
                  }`}
                >
                  <RiSendPlane2Line size={16} />
                </button>
              </div>
              {contextInfo && (
                <p className="text-[8px] text-zinc-700 mt-2 text-center uppercase tracking-widest">{contextInfo}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AIChatPanel
