
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles as SparklesIcon, X as XIcon, Send as SendIcon, 
  User as UserIcon, Bot as BotIcon, Loader2 as LoaderIcon, 
  Maximize2 as MaxIcon, Minimize2 as MinIcon, AlertCircle as AlertIcon, 
  Settings as SettingsIcon, AlertTriangle as WarningIcon, Terminal as TermIcon, 
  ExternalLink as LinkIcon 
} from 'lucide-react';
import { startAIChat } from '../services/geminiService';
import { User as UserType } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  errorType?: 'AUTH' | 'MODEL' | 'QUOTA' | 'GENERIC';
  rawError?: string;
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
        chatInstance.current = await startAIChat(`Anda adalah asisten AI guru SDN 5 Bilato. Nama guru: ${user.name}. Gunakan bahasa Indonesia yang santun dan profesional.`);
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
      const rawMsg = e.message || JSON.stringify(e);
      
      if (rawMsg === 'API_KEY_MISSING') {
        errorType = 'AUTH';
        errorText = 'Kunci API Gemini tidak terdeteksi. Silakan masukkan kunci di menu Pengaturan.';
      } else if (rawMsg === 'MODEL_NOT_READY') {
        errorType = 'MODEL';
        errorText = 'Model Gemini tidak merespon. Silakan coba lagi dalam beberapa saat.';
      } else if (rawMsg === 'QUOTA_EXCEEDED') {
        errorType = 'QUOTA';
        errorText = 'Batas kuota gratis API Google Anda telah tercapai untuk saat ini.';
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: errorText, 
        isError: true, 
        errorType,
        rawError: rawMsg 
      }]);
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
        <SparklesIcon className="group-hover:animate-pulse" size={24} />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 w-full max-w-[420px] bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-[200] transition-all ${isMinimized ? 'h-[72px]' : 'h-[600px] max-h-[85vh]'}`}>
      <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500 rounded-xl shadow-lg"><SparklesIcon size={18} /></div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest leading-none">Asisten AI GPT</h3>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">SDN 5 BILATO CLOUD</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-lg">{isMinimized ? <MaxIcon size={16}/> : <MinIcon size={16}/>}</button>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg"><XIcon size={16} /></button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 no-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`flex gap-3 max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : m.isError ? 'bg-red-100 text-red-600' : 'bg-white border border-slate-200'}`}>
                    {m.role === 'user' ? <UserIcon size={16}/> : m.isError ? <AlertIcon size={16}/> : <BotIcon size={16}/>}
                  </div>
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className={`p-4 rounded-2xl text-[11px] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : m.isError ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                      {m.text || (isLoading && i === messages.length - 1 ? <LoaderIcon size={14} className="animate-spin opacity-50"/> : '')}
                    </div>
                    
                    {m.isError && (
                      <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4 shadow-xl border border-white/10 animate-in zoom-in-95">
                        <div className="flex items-center gap-2 text-rose-400">
                           <WarningIcon size={16}/>
                           <span className="text-[10px] font-black uppercase tracking-widest">Detail Masalah</span>
                        </div>
                        
                        <div className="bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-[9px] text-slate-400 break-all">
                          <div className="flex items-center gap-2 mb-1 text-emerald-400 font-bold">
                            <TermIcon size={10}/> RAW LOG:
                          </div>
                          {m.rawError}
                        </div>

                        {m.errorType === 'QUOTA' && (
                          <div className="space-y-3">
                             <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                                <p className="text-[10px] font-bold mb-2">Solusi:</p>
                                <ul className="text-[9px] list-disc pl-4 space-y-2 text-slate-400">
                                  <li>Tunggu sekitar <b>1-2 menit</b> lalu coba kirim pesan lagi.</li>
                                  <li>Google membatasi jumlah pesan untuk akun gratis demi stabilitas server.</li>
                                  <li>Gunakan model Flash yang lebih ringan untuk mempercepat respon.</li>
                                </ul>
                             </div>
                             <a 
                              href="https://aistudio.google.com/app/usage" 
                              target="_blank"
                              className="w-full bg-slate-800 py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-black transition-all border border-white/10"
                             >
                              <LinkIcon size={12}/> CEK PENGGUNAAN API
                             </a>
                          </div>
                        )}

                        {m.errorType === 'AUTH' && (
                          <div className="space-y-3">
                             <button 
                              onClick={() => { setIsOpen(false); }}
                              className="w-full bg-indigo-600 py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                             >
                              <SettingsIcon size={12}/> KE MENU PENGATURAN
                             </button>
                          </div>
                        )}
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
                {isLoading ? <LoaderIcon size={16} className="animate-spin"/> : <SendIcon size={16}/>}
              </button>
            </div>
            <p className="text-[8px] text-center text-slate-400 mt-3 font-bold uppercase tracking-widest">Model: Gemini Flash Lite</p>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistant;
