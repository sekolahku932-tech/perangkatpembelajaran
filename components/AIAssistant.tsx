
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, User, Bot, Loader2, Maximize2, Minimize2, MessageSquare, AlertCircle } from 'lucide-react';
import { startAIChat } from '../services/geminiService';
import { User as UserType } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

interface AIAssistantProps {
  user: UserType;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: `Halo Bapak/Ibu ${user.name.split(' ')[0]}, saya asisten AI khusus SDN 5 Bilato. Ada yang bisa saya bantu terkait perangkat ajar Kelas ${user.kelas} hari ini?` }
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
        chatInstance.current = startAIChat(`Anda adalah asisten AI profesional untuk guru di SD Negeri 5 Bilato. 
        Nama guru: ${user.name}. Kelas: ${user.kelas}. Mapel yang diampu: ${user.mapelDiampu.join(', ')}.
        Tugas Anda membantu menyusun ide pembelajaran, materi, soal, atau jurnal. Berikan jawaban yang praktis dan sesuai Kurikulum Merdeka.`);
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
      let errorText = 'Maaf, terjadi kendala teknis. Silakan coba sesaat lagi.';
      
      if (e.message === 'API_KEY_MISSING') {
        errorText = 'Kunci API Gemini belum terkonfigurasi di Vercel. Harap tambahkan API_KEY di Settings > Environment Variables dan lakukan Redeploy.';
      } else if (e.message === 'MODEL_NOT_FOUND') {
        errorText = 'Model Gemini tidak ditemukan atau API "Generative Language" belum diaktifkan di Google Cloud Console untuk project Anda.';
      } else if (e.message === 'QUOTA_EXHAUSTED') {
        errorText = 'Batas penggunaan API gratis Anda telah tercapai untuk saat ini. Silakan coba lagi nanti.';
      }

      setMessages(prev => [...prev, { role: 'model', text: errorText, isError: true }]);
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
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black shadow-xl border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          TANYA ASISTEN AI (GPT)
        </div>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 w-full max-w-[400px] bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-[200] transition-all ${isMinimized ? 'h-[72px]' : 'h-[600px] max-h-[80vh]'}`}>
      <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500 rounded-xl shadow-lg">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest">Asisten AI GPT</h3>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[8px] font-bold text-slate-400 uppercase">Online & Ready</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            {isMinimized ? <Maximize2 size={16}/> : <Minimize2 size={16}/>}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 no-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : m.isError ? 'bg-red-100 text-red-600' : 'bg-white text-slate-900 border border-slate-200'}`}>
                    {m.role === 'user' ? <User size={16}/> : m.isError ? <AlertCircle size={16}/> : <Bot size={16}/>}
                  </div>
                  <div className={`p-4 rounded-2xl text-[11px] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : m.isError ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                    {m.text || (isLoading && i === messages.length - 1 ? <Loader2 size={14} className="animate-spin opacity-50"/> : '')}
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
                placeholder="Tanya ide belajar, soal, materi..."
                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-5 pr-14 text-xs font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:grayscale transition-all shadow-lg active:scale-90"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
              </button>
            </div>
            <p className="text-[8px] text-center text-slate-400 mt-3 font-bold uppercase tracking-widest">Powered by Gemini 3 Flash Assistant</p>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistant;
