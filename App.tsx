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

const APP_VERSION = '3.7';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<'DASHBOARD' | 'CP' | 'ANALISIS' | 'ATP' | 'SETTING' | 'USER' | 'EFEKTIF' | 'PROTA' | 'PROMES' | 'RPM' | 'LKPD' | 'ASESMEN_SUMATIF' | 'EVALUASI' | 'JURNAL'>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFormData, setProfileFormData] = useState({ name: '', nip: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    const savedVersion = localStorage.getItem('sdn5_app_version');
    if (savedVersion !== APP_VERSION) {
      localStorage.setItem('sdn5_app_version', APP_VERSION);
      if (savedVersion) window.location.reload(); 
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: any) => {
      if (firebaseUser) {
        // Gunakan timeout untuk mencegah spinner abadi jika Firestore gagal merespon
        const timeoutId = setTimeout(() => {
          if (loading) {
            console.error("Sinkronisasi database timeout.");
            setLoading(false);
          }
        }, 8000);

        const unsubUser = onSnapshot(doc(db, "users", firebaseUser.uid), (snap: any) => {
          clearTimeout(timeoutId);
          if (snap.exists()) {
            const userData = { id: firebaseUser.uid, ...snap.data() } as User;
            setUser(userData);
            setProfileFormData({
              name: userData.name || '',
              nip: userData.nip || ''
            });
          } else {
            setUser({ id: firebaseUser.uid, role: 'guru', teacherType: 'kelas', name: 'Guru Baru', nip: '-', kelas: '-', username: firebaseUser.email?.split('@')[0] || '', mapelDiampu: [] });
          }
          setLoading(false);
        }, (error) => {
          clearTimeout(timeoutId);
          console.error("Firestore error:", error);
          setLoading(false);
        });
        return () => {
          clearTimeout(timeoutId);
          unsubUser();
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setShowLogoutConfirm(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await setDoc(doc(db, "users", user.id), {
        name: profileFormData.name.toUpperCase(),
        nip: profileFormData.nip
      }, { merge: true });
      setShowProfileModal(false);
      alert('Profil diperbarui!');
    } catch (e) {
      alert('Gagal simpan.');
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
          SINKRONISASI CLOUD V3.7...<br/>
          <span className="font-medium lowercase opacity-50 mt-1 block">Tunggu sebentar sedang memuat data</span>
        </p>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      <AIAssistant user={user} />

      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-md overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3"><div className="p-2.5 bg-blue-600 text-white rounded-2xl"><UserIcon size={20} /></div><h3 className="text-lg font-black text-slate-900 uppercase">Profil Guru</h3></div>
              <button onClick={() => setShowProfileModal(false)} className="p-2 text-slate-400"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-5">
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nama Lengkap</label><input className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold uppercase outline-none" value={profileFormData.name} onChange={e => setProfileFormData({...profileFormData, name: e.target.value})} /></div>
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">NIP</label><input className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold uppercase outline-none" value={profileFormData.nip} onChange={e => setProfileFormData({...profileFormData, nip: e.target.value})} /></div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex gap-3">
              <button onClick={() => setShowProfileModal(false)} className="flex-1 px-6 py-4 rounded-2xl text-xs font-black text-slate-500 bg-white border">BATAL</button>
              <button onClick={handleSaveProfile} disabled={isSavingProfile} className="flex-1 px-6 py-4 rounded-2xl text-xs font-black text-white bg-blue-600 flex items-center justify-center gap-2">
                {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} SIMPAN
              </button>
            </div>
          </div>
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 z-50 transition-transform duration-300 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg"><School size={24} /></div>
              <div><h1 className="text-sm font-black text-slate-900 uppercase leading-none">SDN 5 BILATO</h1><p className="text-[8px] text-indigo-600 font-black uppercase mt-1 tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded">V3.7 - RECOVERY FINAL</p></div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {navItems.map((item) => {
              if (item.adminOnly && user.role !== 'admin') return null;
              return (
                <button key={item.id} onClick={() => { setActiveMenu(item.id as any); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${activeMenu === item.id ? `${item.bg} ${item.color} shadow-sm border` : 'text-slate-600 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3"><span className={`${activeMenu === item.id ? item.color : 'text-slate-400'}`}>{item.icon}</span><span>{item.label}</span></div>
                  {activeMenu === item.id && <ChevronRight size={14} />}
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t shrink-0">
            <button onClick={() => setShowProfileModal(true)} className="w-full bg-slate-50 hover:bg-slate-100 rounded-2xl p-4 flex items-center gap-3 mb-4 transition-all">
              <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center text-slate-400"><UserIcon size={20} /></div>
              <div className="overflow-hidden text-left"><p className="text-xs font-black text-slate-900 truncate uppercase">{user.name}</p><p className="text-[9px] text-slate-400 font-bold uppercase">DATABASE SINKRON</p></div>
            </button>
            <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-black text-red-600 hover:bg-red-50 uppercase"><LogOut size={18} /> KELUAR</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        <header className="bg-white border-b h-16 flex items-center justify-between px-4 shrink-0 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"><Menu size={24} /></button>
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest"><GraduationCap size={16} className="text-blue-500" /><span>Menu</span><ChevronRight size={12} /><span className="text-slate-900">{navItems.find(i => i.id === activeMenu)?.label}</span></div>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-1.5 rounded-full flex items-center gap-2">
                <ShieldCheck size={14}/><span className="text-[9px] font-black uppercase tracking-widest">Recovery V3.7</span>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
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
          </div>
        </main>
      </div>
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center"><div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><AlertTriangle size={32} /></div><h3 className="text-xl font-black text-slate-900 uppercase mb-2">Logout</h3><p className="text-slate-500 font-medium text-sm">Keluar dari Cloud?</p></div>
            <div className="p-4 bg-slate-50 flex gap-3"><button onClick={() => setShowLogoutConfirm(false)} className="flex-1 px-6 py-3 rounded-xl text-xs font-black bg-white border">BATAL</button><button onClick={handleLogout} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-white bg-red-600">KELUAR</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;