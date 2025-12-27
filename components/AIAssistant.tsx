
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, User, Bot, Loader2, Maximize2, Minimize2, AlertCircle, Key, Settings, AlertTriangle } from 'lucide-react';
import { startAIChat } from '../services/geminiService';
import { User as UserType } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  errorType?: 'AUTH' | 'MODEL' | 'QUOTA' | 'GENERIC';
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
      let errorText = 'Maaf, terjadi kesalahan teknis pada sistem AI.';
      let errorType: Message['errorType'] = 'GENERIC';
      
      if (e.message === 'API_KEY_MISSING') {
        errorType = 'AUTH';
        errorText = 'Kunci API Gemini (API_KEY) tidak terdeteksi oleh sistem hosting (Netlify/Vercel).';
      } else if (e.message === 'MODEL_NOT_READY') {
        errorType = 'MODEL';
        errorText = 'Model Gemini saat ini belum siap atau tidak tersedia untuk kunci API Anda.';
      } else if (e.message === 'QUOTA_EXCEEDED') {
        errorType = 'QUOTA';
        errorText = 'Batas penggunaan API gratis Anda telah habis hari ini.';
      }

      setMessages(prev => [...prev, { role: 'model', text: errorText, isError: true, errorType }]);
      chatInstance.current = null;
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
    <div className={`fixed bottom-6 right-6 w-full max-w-[420px] bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-[200] transition-all ${isMinimized ? 'h-[72px]' : 'h-[600px] max-h-[85vh]'}`}>
      <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500 rounded-xl shadow-lg"><Sparkles size={18} /></div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest leading-none">Asisten AI GPT</h3>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">SDN 5 BILATO CLOUD</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-lg">{isMinimized ? <Maximize2 size={16}/> : <Minimize2 size={16}/>}</button>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg"><X size={16} /></button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 no-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`flex gap-3 max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : m.isError ? 'bg-red-100 text-red-600' : 'bg-white border border-slate-200'}`}>
                    {m.role === 'user' ? <User size={16}/> : m.isError ? <AlertCircle size={16}/> : <Bot size={16}/>}
                  </div>
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className={`p-4 rounded-2xl text-[11px] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : m.isError ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                      {m.text || (isLoading && i === messages.length - 1 ? <Loader2 size={14} className="animate-spin opacity-50"/> : '')}
                    </div>
                    {m.isError && m.errorType === 'AUTH' && (
                      <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4 shadow-xl border border-white/10 animate-in zoom-in-95">
                        <div className="flex items-center gap-2 text-rose-400">
                           <AlertTriangle size={16}/>
                           <span className="text-[10px] font-black uppercase tracking-widest">Solusi Perbaikan</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-slate-300">Konfigurasi server hosting Anda bermasalah. Gunakan solusi input manual:</p>
                        <div className="space-y-3">
                           <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                              <p className="text-[10px] font-bold mb-1">Cara Hubungkan Kunci API:</p>
                              <ol className="text-[9px] list-decimal pl-4 space-y-1 text-slate-400">
                                <li>Dapatkan Kunci di <b>AI Studio</b>.</li>
                                <li>Masuk ke menu <b>PENGATURAN</b> di aplikasi ini.</li>
                                <li>Tempel Kunci di bagian <b>KONFIGURASI AI</b>.</li>
                                <li>Klik <b>SIMPAN</b> & AI akan langsung aktif!</li>
                              </ol>
                           </div>
                           <button 
                            onClick={() => { setIsOpen(false); /* Trigger navigation in parent if possible or just guide user */ }}
                            className="w-full bg-indigo-600 py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                           >
                            <Settings size={12}/> KE MENU PENGATURAN
                           </button>
                        </div>
                      </div>
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
                disabled={isLoading}
                placeholder="Tanya ide ajar, soal, atau materi..."
                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-5 pr-14 text-xs font-medium focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-90"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
              </button>
            </div>
            <p className="text-[8px] text-center text-slate-400 mt-3 font-bold uppercase tracking-widest">Model: Gemini Flash Asst.</p>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistant;
