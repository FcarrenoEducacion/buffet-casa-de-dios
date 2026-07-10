import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, Sparkles, MessageSquare, X, Brain, HelpCircle, Loader } from 'lucide-react';

interface GeminiAssistantProps {
  onSendMessage: (text: string, history: ChatMessage[], useHighThinking: boolean) => Promise<string>;
  isOpenDefault?: boolean;
}

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ onSendMessage, isOpenDefault = false }) => {
  const [isOpen, setIsOpen] = useState<boolean>(isOpenDefault);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "¡Hola! Bienvenido al Buffet Casa de Dios. Soy Ángel del Sabor, tu consejero culinario y guía de nuestro buffet benéfico de la Iglesia Casa de Dios. ¿En qué te puedo bendecir hoy? Puedo recomendarte platos, contarte sobre nuestros proyectos sociales o guiarte a realizar tu pedido.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [useHighThinking, setUseHighThinking] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Collect current conversation history (up to last 12 messages for performance)
      const currentHistory = [...messages, userMsg].slice(-12);
      
      const replyText = await onSendMessage(textToSend, currentHistory, useHighThinking);
      
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: "assistant",
        text: replyText,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "assistant",
          text: "Lo siento, tuvimos un problema de comunicación espiritual con el servidor de inteligencia artificial. Por favor vuelve a intentarlo en un momento. ¡Bendiciones!",
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "¿Cuál es la causa benéfica?",
    "Recomiéndame algo dulce y nacional.",
    "Tengo Q50, ¿qué puedo armar?",
    "¿Cómo pido con el código QR?"
  ];

  return (
    <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end" id="gemini-chat-widget">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          id="open-chat-widget-btn"
          className="bg-amber-400 hover:bg-amber-300 text-black p-4 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center gap-2 cursor-pointer border border-amber-400/20 group"
          title="Asistente de Inteligencia Artificial"
        >
          <MessageSquare className="w-6 h-6 text-black" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300 text-xs font-extrabold uppercase tracking-wider whitespace-nowrap">
            Pregunta a la IA
          </span>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full"></div>
        </button>
      )}

      {/* Expanded Chat Box */}
      {isOpen && (
        <div className="w-[90vw] sm:w-[380px] h-[500px] glass-card-heavy rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up text-white">
          {/* Header */}
          <div className="p-4 bg-white/5 border-b border-white/10 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-amber-400 p-1.5 rounded-xl text-black shadow-inner animate-pulse-subtle">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-sm leading-tight text-white">Ángel del Sabor</span>
                <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Asistente IA de Casa de Dios</span>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              id="close-chat-widget-btn"
              className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Model toggle settings inside Chat (VFlash vs Pro-Reasoning) */}
          <div className="bg-white/5 px-4 py-1.5 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1">
              <Brain className={`w-3.5 h-3.5 ${useHighThinking ? 'text-amber-400 animate-pulse' : 'text-white/30'}`} />
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider font-display">
                {useHighThinking ? 'IA Avanzada (gemini-3.1-pro)' : 'IA Veloz (gemini-3.5-flash)'}
              </span>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={useHighThinking} 
                onChange={(e) => setUseHighThinking(e.target.checked)} 
                className="sr-only peer"
                id="thinking-mode-toggle"
              />
              <div className="w-8 h-4 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-amber-400"></div>
              <span className="text-[9px] font-bold text-white/50 ml-1.5 uppercase">Pensar Alto</span>
            </label>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-3 bg-transparent">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col max-w-[85%] ${
                  m.sender === "user" ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    m.sender === "user"
                      ? "bg-amber-400 text-black font-semibold rounded-br-none"
                      : "bg-white/10 text-white border border-white/10 rounded-bl-none shadow-sm"
                  }`}
                >
                  {/* Basic text paragraphs formatter */}
                  {m.text.split('\n').map((line, idx) => (
                    <p key={idx} className={idx > 0 ? "mt-1.5" : ""}>{line}</p>
                  ))}
                </div>
                <span className="text-[9px] text-white/40 mt-1 font-mono">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            
            {loading && (
              <div className="self-start flex flex-col max-w-[85%] items-start">
                <div className="p-3 rounded-2xl text-xs bg-white/5 text-white/70 border border-white/10 flex items-center gap-2">
                  <Loader className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>
                    {useHighThinking ? 'Analizando recetas y el plan social...' : 'Buscando platos...'}
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt suggestions shortcuts */}
          {messages.length === 1 && !loading && (
            <div className="px-4 py-2 flex flex-col gap-1.5 border-t border-white/10 shrink-0">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider font-display">Preguntas sugeridas:</span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(s)}
                    className="text-[10px] bg-white/5 hover:bg-amber-400 hover:text-black border border-white/10 hover:border-amber-400 px-2.5 py-1.5 rounded-xl text-white/80 whitespace-nowrap cursor-pointer transition-colors font-bold"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Input Footer */}
          <div className="p-3 bg-white/5 border-t border-white/10 shrink-0 flex gap-2">
            <input
              type="text"
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Pregúntale a Ángel del Sabor..."
              className="flex-grow bg-[#0f172a]/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white placeholder-white/30"
              disabled={loading}
            />
            <button
              onClick={() => handleSend(input)}
              id="send-chat-btn"
              disabled={!input.trim() || loading}
              className="bg-amber-400 hover:bg-amber-300 disabled:bg-white/5 disabled:text-white/30 text-black p-2 rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
