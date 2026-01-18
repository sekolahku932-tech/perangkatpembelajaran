
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, GraduationCap, School, ListTree, LogOut, 
  User as UserIcon, Settings, Users, CalendarDays, FileText, 
  CalendarRange, Rocket, Menu, ChevronRight, Loader2, AlertTriangle,
  BarChart3, LayoutDashboard, Code, BookText, PenTool, ClipboardCheck,
  ClipboardList, Lock, Key, ShieldAlert, Info, X, Save, Eye, EyeOff, ShieldCheck, Cpu, Zap, RefreshCcw
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import CPManager from './components/CPManager';
import AnalisisManager from './components/AnalisisManager';
import ATPManager from './components/ATPManager';
import SettingsManager from './components/SettingsManager';
import UserManager from './components/UserManager';
import HariEfektifManager from './components/HariEfektifManager';
import ProtaManager from './components/ProtaManager';
import PromesManager from './components/PromesManager';
import RPMManager from './components/RPMManager';
import AsesmenManager from './components/AsesmenManager';
import JurnalManager from './components/JurnalManager';
import LKPDManager from './components/LKPDManager';
import EvaluasiManager from './components/EvaluasiManager';
import AIAssistant from './components/AIAssistant';
import LoginPage from './components/LoginPage';
import { User } from './types';
import { auth, db, onAuthStateChanged, signOut, doc, onSnapshot, setDoc } from './services/firebase';

const APP_VERSION = '3.5';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<'DASHBOARD' | 'CP' | 'ANALISIS' | 'ATP' | 'SETTING' | 'USER' | 'EFEKTIF' | 'PROTA' | 'PROMES' | 'RPM' | 'LKPD' | 'ASESMEN_SUMATIF' | 'EVALUASI' | 'JURNAL'>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFormData, setProfileFormData] = useState({ name: '', nip: '', apiKey: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // AUTO-RELOAD LOGIC FOR CACHE BREAKING
  useEffect(() => {
    const savedVersion = localStorage.getItem('sdn5_app_version');
    if (savedVersion !== APP_VERSION) {
      console.warn("New Version Detected. Purging Cache...");
      localStorage.setItem('sdn5_app_version', APP_VERSION);
      window.location.reload(); 
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const unsubUser = onSnapshot(doc(db, "users", firebaseUser.uid), (snap) => {
          if (snap.exists()) {
            const userData = { id: firebaseUser.uid, ...snap.data() } as User;
            setUser(userData);
            if (!showProfileModal) {
              setProfileFormData({
                name: userData.name || '',
                nip: userData.nip || '',
                apiKey: userData.apiKey || ''
              });
            }
          } else {
            const newUser = { 
              id: firebaseUser.uid, 
              username: firebaseUser.email?.split('@')[0] || '', 
              role: 'guru' as const, 
              teacherType: 'kelas' as const,
              name: firebaseUser.displayName || 'Guru Baru', 
              nip: '-', 
              kelas: '-', 
              mapelDiampu: [],
              apiKey: '' 
            };
            setUser(newUser);
          }
          setLoading(false);
        });
        return () => unsubUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [showProfileModal]);

  const handleLogout = async () => {
    await signOut(auth);
    setShowLogoutConfirm(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const cleanKey = profileFormData.apiKey.trim();
    
    if (cleanKey.length > 0 && cleanKey.length < 25) {
      alert('API Key nampaknya tidak lengkap. Harap salin seluruh kode dari Google AI Studio.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await setDoc(doc(db, "users", user.id), {
        name: profileFormData.name.toUpperCase(),
        nip: profileFormData.nip,
        apiKey: cleanKey
      }, { merge: true });
      
      setShowProfileModal(false);
      alert('RECOVERY BERHASIL: Mesin Flash Lite V3.5 Aktif.');
    } catch (e) {
      alert('Gagal: ' + (e as Error).message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard size={20} />, color: 'text-slate-900', bg: 'bg-slate-100' },
    { id: 'EFEKTIF', label: 'Hari Efektif', icon: <CalendarDays size={20} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'CP', label: 'Capaian Pembelajaran', icon: <BookOpen size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'ANALISIS', label: 'Analisis CP-TP', icon: <ClipboardList size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'ATP', label: 'Alur Tujuan (ATP)', icon: <ListTree size={20} />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'PROTA', label: 'Program Tahunan', icon: <FileText size={20} />, color: 'text-violet-600', bg: 'bg-violet-50' },
    { id: 'PROMES', label: 'Program Semester', icon: <CalendarRange size={20} />, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'RPM', label: 'RPM (Deep Learning)', icon: <Rocket size={20} />, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'LKPD', label: 'Lembar Kerja (LKPD)', icon: <PenTool size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'JURNAL', label: 'Jurnal Harian', icon: <BookText size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'ASESMEN_SUMATIF', label: 'Asesmen Sumatif', icon: <BarChart3 size={20} />, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'EVALUASI', label: 'Evaluasi & Nilai', icon: <ClipboardCheck size={20} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'USER', label: 'Manajemen User', icon: <Users size={20} />, color: 'text-slate-600', bg: 'bg-slate-100', adminOnly: true },
    { id: 'SETTING', label: 'Pengaturan', icon: <Settings size={20} />, color: 'text-slate-700', bg: 'bg-slate-200', adminOnly: true },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-amber-600 mb-4" size={48} />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Memulihkan Koneksi Cloud...</p>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const hasNoApiKey = !user.apiKey || user.apiKey.trim().length < 25;
  
  const isMenuAllowedWithoutKey = (menuId: string) => {
    if (menuId === 'DASHBOARD') return true;
    if (user.role === 'admin' && (menuId === 'USER' || menuId === 'SETTING')) return true;
    return false;
  };

  const isCurrentMenuRestricted = hasNoApiKey && !isMenuAllowedWithoutKey(activeMenu);

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {!hasNoApiKey && <AIAssistant user={user} />}

      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-600 text-white rounded-2xl shadow-lg"><UserIcon size={20} /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase">Profil & API Key</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Update Data Pribadi</p>
                </div>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-5">
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Nama Lengkap</label><input className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-amber-600" value={profileFormData.name} onChange={e => setProfileFormData({...profileFormData, name: e.target.value})} /></div>
              <div className="p-5 bg-amber-50 border border-amber-100 rounded-3xl space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1"><Key size={14}/> Gemini API Key Pribadi</label>
                <div className="relative">
                  <input type={showKey ? "text" : "password"} className="w-full bg-white border border-amber-200 rounded-xl py-3 pl-4 pr-12 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Salin dari Google AI Studio..." value={profileFormData.apiKey} onChange={e => setProfileFormData({...profileFormData, apiKey: e.target.value})} />
                  <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400">{showKey ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                </div>
                <p className="text-[9px] text-amber-600 font-medium leading-relaxed italic">Wajib: Gunakan API Key sendiri agar terhindar dari Limit 0 model Pro.</p>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowProfileModal(false)} className="flex-1 px-6 py-4 rounded-2xl text-xs font-black text-slate-500 bg-white border border-slate-200">BATAL</button>
              <button onClick={handleSaveProfile} disabled={isSavingProfile} className="flex-1 px-6 py-4 rounded-2xl text-xs font-black text-white bg-amber-600 shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} SIMPAN & AKTIFKAN
              </button>
            </div>
          </div>
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 z-50 transition-transform duration-300 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 rounded-xl text-white shadow-lg"><School size={24} /></div>
              <div>
                <h1 className="text-sm font-black text-slate-900 uppercase leading-none">SDN 5 BILATO</h1>
                <p className="text-[8px] text-amber-600 font-black uppercase mt-1 tracking-widest bg-amber-50 px-1.5 py-0.5 rounded">V3.5 - RECOVERY ENGINE</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {navItems.map((item) => {
              if (item.adminOnly && user.role !== 'admin') return null;
              const isLocked = hasNoApiKey && !isMenuAllowedWithoutKey(item.id);
              return (
                <div key={item.id} className="relative group">
                  <button 
                    disabled={isLocked}
                    onClick={() => { setActiveMenu(item.id as any); setIsSidebarOpen(false); }} 
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${isLocked ? 'opacity-30 cursor-not-allowed grayscale' : activeMenu === item.id ? `${item.bg} ${item.color} shadow-sm border border-slate-100` : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`${activeMenu === item.id ? item.color : 'text-slate-400'}`}>{isLocked ? <Lock size={16} /> : item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {activeMenu === item.id && !isLocked && <ChevronRight size={14} />}
                  </button>
                </div>
              );
            })}
          </nav>
          <div className="p-4 border-t border-slate-100 shrink-0">
            <button onClick={() => setShowProfileModal(true)} className="w-full bg-slate-50 hover:bg-slate-100 rounded-2xl p-4 flex items-center gap-3 mb-4 transition-all group">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-amber-600 transition-all"><UserIcon size={20} /></div>
              <div className="overflow-hidden text-left">
                <p className="text-xs font-black text-slate-900 truncate uppercase">{user.name}</p>
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${hasNoApiKey ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{hasNoApiKey ? 'KUNCI MATI' : 'KUNCI AKTIF'}</p>
                </div>
              </div>
            </button>
            <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-black text-red-600 hover:bg-red-50 transition-all uppercase"><LogOut size={18} /> KELUAR</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 shrink-0 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"><Menu size={24} /></button>
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <GraduationCap size={16} className="text-amber-500" />
              <span>Menu</span><ChevronRight size={12} />
              <span className="text-slate-900">{navItems.find(i => i.id === activeMenu)?.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 transition-all ${hasNoApiKey ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                {hasNoApiKey ? <ShieldAlert size={14}/> : <ShieldCheck size={14}/>}
                <span className="text-[9px] font-black uppercase tracking-widest">{hasNoApiKey ? 'Akses AI Terkunci' : 'Flash Lite V3.5'}</span>
             </div>
             <button onClick={() => window.location.reload()} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-full border border-amber-500/30 hover:bg-black transition-all">
                <RefreshCcw size={12} className="text-amber-400" />
                <span className="text-[8px] font-black uppercase tracking-tighter">REFRESH SYSTEM</span>
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {isCurrentMenuRestricted ? (
              <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in-95 duration-500">
                 <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-[40px] flex items-center justify-center mb-8 shadow-xl shadow-amber-200/50"><ShieldAlert size={48}/></div>
                 <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">Update Wajib V3.5</h2>
                 <p className="text-slate-500 font-medium max-w-md leading-relaxed mb-8">
                    Sistem mendeteksi bahwa API Key sekolah telah diblokir untuk model Pro. Kami telah beralih ke <b>Mesin V3.5 (Flash Lite)</b>. Harap input API Key Anda sendiri agar sistem bisa berjalan kembali.
                 </p>
                 <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm mb-8 text-left max-w-md w-full">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Info size={14} className="text-amber-500"/> Instruksi Pemulihan:</h4>
                    <ul className="space-y-3 text-[11px] font-bold text-slate-600">
                       <li className="flex gap-3"><span className="w-5 h-5 bg-amber-50 text-amber-600 rounded flex items-center justify-center shrink-0">1</span><span>Masuk ke menu Profil, hapus kunci lama, tempel kunci baru dari AI Studio.</span></li>
                       <li className="flex gap-3"><span className="w-5 h-5 bg-amber-50 text-amber-600 rounded flex items-center justify-center shrink-0">2</span><span>V3.5 menggunakan model <b>Flash Lite</b> yang lebih stabil dan hemat kuota.</span></li>
                       <li className="flex gap-3"><span className="w-5 h-5 bg-amber-50 text-amber-600 rounded flex items-center justify-center shrink-0">3</span><span>Jika masih melihat error model PRO, tekan <b>Ctrl + F5</b> SEKARANG.</span></li>
                    </ul>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => setActiveMenu('DASHBOARD')} className="px-8 py-4 rounded-2xl text-xs font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-all">KEMBALI</button>
                    <button onClick={() => setShowProfileModal(true)} className="bg-amber-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-xl flex items-center gap-2"><Key size={16}/> UPDATE KUNCI SAYA</button>
                 </div>
              </div>
            ) : (
              <>
                {activeMenu === 'DASHBOARD' && <Dashboard user={user} onNavigate={(id) => setActiveMenu(id)} onOpenProfile={() => setShowProfileModal(true)} />}
                {activeMenu === 'CP' && <CPManager user={user} />}
                {activeMenu === 'ANALISIS' && <AnalisisManager user={user} />}
                {activeMenu === 'ATP' && <ATPManager user={user} />}
                {activeMenu === 'SETTING' && <SettingsManager user={user} />}
                {activeMenu === 'USER' && <UserManager user={user} />}
                {activeMenu === 'EFEKTIF' && <HariEfektifManager user={user} />}
                {activeMenu === 'PROTA' && <ProtaManager user={user} />}
                {activeMenu === 'PROMES' && <PromesManager user={user} />}
                {activeMenu === 'RPM' && <RPMManager user={user} />}
                {activeMenu === 'LKPD' && <LKPDManager user={user} />}
                {activeMenu === 'JURNAL' && <JurnalManager user={user} />}
                {activeMenu === 'ASESMEN_SUMATIF' && <AsesmenManager type="sumatif" user={user} />}
                {activeMenu === 'EVALUASI' && <EvaluasiManager user={user} />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
