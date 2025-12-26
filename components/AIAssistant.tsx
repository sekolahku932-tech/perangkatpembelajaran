
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, User, Bot, Loader2, Maximize2, Minimize2, AlertCircle, Key } from 'lucide-react';
import { startAIChat } from '../services/geminiService';
import { User as UserType } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  needsKey?: boolean;
}

interface AIAssistantProps {
  user: UserType;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: `Halo Bapak/Ibu ${user.name.split(' ')[0]}, saya asisten AI SDN 5 Bilato. Ada yang bisa saya bantu hari ini?` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInstance = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleOpenKeySelection = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // Reset chat after key selection
      chatInstance.current = null;
      setMessages(prev => [...prev, { role: 'model', text: 'Kunci API berhasil dihubungkan! Silakan kirim pesan lagi untuk mencoba.' }]);
    } else {
      alert('Fitur seleksi kunci tidak tersedia di browser ini. Pastikan Anda membuka melalui tautan hosting resmi.');
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      if (!chatInstance.current) {
        chatInstance.current = await startAIChat(`Anda adalah asisten AI guru SDN 5 Bilato. Nama guru: ${user.name}.`);
      }

      const result = await chatInstance.current.sendMessageStream({ message: userMessage });
      let fullText = '';
      
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of result) {
        fullText += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = fullText;
          return newMessages;
        });
      }
    } catch (e: any) {
      let errorText = 'Maaf, terjadi kendala teknis.';
      let needsKey = false;
      
      if (e.message === 'API_KEY_MISSING') {
        errorText = 'Kunci API Gemini belum terhubung atau tidak valid untuk domain ini.';
        needsKey = true;
      } else if (e.message === 'MODEL_NOT_FOUND') {
        errorText = 'Model AI tidak ditemukan. Pastikan API Generative Language sudah aktif di Google Cloud Anda.';
      }

      setMessages(prev => [...prev, { role: 'model', text: errorText, isError: true, needsKey }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 hover:scale-110 transition-all z-[100] group"
      >
        <Sparkles className="group-hover:animate-pulse" size={24} />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 w-full max-w-[400px] bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-[200] transition-all ${isMinimized ? 'h-[72px]' : 'h-[600px] max-h-[80vh]'}`}>
      <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500 rounded-xl shadow-lg"><Sparkles size={18} /></div>
          <h3 className="text-xs font-black uppercase tracking-widest">Asisten AI GPT</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-lg">{isMinimized ? <Maximize2 size={16}/> : <Minimize2 size={16}/>}</button>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg"><X size={16} /></button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 no-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : m.isError ? 'bg-red-100 text-red-600' : 'bg-white border border-slate-200'}`}>
                    {m.role === 'user' ? <User size={16}/> : m.isError ? <AlertCircle size={16}/> : <Bot size={16}/>}
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className={`p-4 rounded-2xl text-[11px] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : m.isError ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-none' : 'bg-white text-slate-800 rounded-tl-none'}`}>
                      {m.text || (isLoading && i === messages.length - 1 ? <Loader2 size={14} className="animate-spin opacity-50"/> : '')}
                    </div>
                    {m.needsKey && (
                      <button 
                        onClick={handleOpenKeySelection}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg animate-bounce"
                      >
                        <Key size={14}/> Hubungkan API Key Sekarang
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative flex items-center">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Tanya ide belajar..."
                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-5 pr-14 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistant;
