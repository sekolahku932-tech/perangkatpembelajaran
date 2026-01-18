
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, ListTree, FileText, 
  CalendarRange, Rocket, Users, GraduationCap, 
  LayoutDashboard, Cloud, CheckCircle2, ArrowRight,
  BarChart3, Code, ClipboardList, AlertTriangle, Key, ShieldAlert, Lock
} from 'lucide-react';
import { db, collection, onSnapshot } from '../services/firebase';
import { User } from '../types';

interface DashboardProps {
  user: User;
  onNavigate: (menu: any) => void;
  onOpenProfile?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate, onOpenProfile }) => {
  const [stats, setStats] = useState({
    cp: 0, analisis: 0, atp: 0, prota: 0, promes: 0, rpm: 0, siswa: 0, users: 0, kisikisi: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const collections = [
      { key: 'cp', name: 'cps' }, { key: 'analisis', name: 'analisis' }, { key: 'atp', name: 'atp' },
      { key: 'prota', name: 'prota' }, { key: 'promes', name: 'promes' }, { key: 'rpm', name: 'rpm' },
      { key: 'siswa', name: 'siswa' }, { key: 'users', name: 'users' }, { key: 'kisikisi', name: 'kisikisi' }
    ];

    const unsubscribes = collections.map(coll => 
      onSnapshot(collection(db, coll.name), (snap) => {
        let count = 0;
        if (user.role === 'admin') {
          count = snap.size;
        } else {
          count = snap.docs.filter(doc => {
            const data = doc.data();
            const matchKelas = data.kelas === user.kelas;
            const matchMapel = (user.mapelDiampu || []).includes(data.mataPelajaran || data.mapel);
            if (coll.key === 'cp') return (user.mapelDiampu || []).includes(data.mataPelajaran);
            return matchKelas || matchMapel;
          }).length;
        }
        setStats(prev => ({ ...prev, [coll.key]: count }));
      })
    );

    setLoading(false);
    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  const hasPersonalKey = user.apiKey && user.apiKey.trim().length > 10;

  const statCards = [
    { id: 'CP', label: 'Capaian Pembelajaran', count: stats.cp, icon: <BookOpen />, color: 'blue' },
    { id: 'ANALISIS', label: 'Analisis CP-TP', count: stats.analisis, icon: <ClipboardList />, color: 'emerald' },
    { id: 'ATP', label: 'Alur Tujuan (ATP)', count: stats.atp, icon: <ListTree />, color: 'amber' },
    { id: 'PROTA', label: 'Program Tahunan', count: stats.prota, icon: <FileText />, color: 'violet' },
    { id: 'PROMES', label: 'Program Semester', count: stats.promes, icon: <CalendarRange />, color: 'rose' },
    { id: 'RPM', label: 'RPM Mendalam', count: stats.rpm, icon: <Rocket />, color: 'cyan' },
    { id: 'ASESMEN_SUMATIF', label: 'Asesmen Sumatif', count: stats.kisikisi, icon: <BarChart3 />, color: 'indigo' },
    { id: 'USER', label: 'Akses Pengguna', count: stats.users, icon: <GraduationCap />, color: 'slate', adminOnly: true },
  ].filter(card => !card.adminOnly || user.role === 'admin');

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 ring-blue-500',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500',
    violet: 'bg-violet-50 text-violet-600 border-violet-100 ring-violet-500',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 ring-rose-500',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100 ring-cyan-500',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 ring-indigo-500',
    slate: 'bg-slate-50 text-slate-600 border-slate-100 ring-slate-500',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {!hasPersonalKey && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-[32px] p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-rose-900/5 animate-in slide-in-from-top-4 duration-1000">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
            <ShieldAlert size={32} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-rose-900 font-black uppercase text-sm tracking-tight mb-1">Akses AI Terkunci Secara Mandiri</h3>
            <p className="text-rose-700 text-xs font-medium leading-relaxed">
              Anda wajib menginput <b>API Key pribadi</b> di Profil Anda untuk menggunakan fitur kurikulum. Kunci sekolah dinonaktifkan demi kestabilan kuota.
            </p>
          </div>
          <button 
            onClick={onOpenProfile}
            className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg active:scale-95"
          >
            <Key size={14} /> Atur Kunci Saya
          </button>
        </div>
      )}

      <div className="bg-slate-900 rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-10 scale-150 rotate-12">
          <LayoutDashboard size={200} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="px-4 py-1.5 bg-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Cloud size={12} /> Cloud Aktif
            </div>
            <div className={`px-4 py-1.5 ${hasPersonalKey ? 'bg-emerald-500' : 'bg-rose-500'} rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2`}>
              {hasPersonalKey ? <Key size={12} /> : <Lock size={12} />} {hasPersonalKey ? 'Personal Key Active' : 'Key Missing'}
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
            Selamat Datang, <span className="text-blue-400">{user.name}</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-medium leading-relaxed mb-8">
            {hasPersonalKey 
              ? `Kunci AI Anda terverifikasi. Anda memiliki akses penuh ke seluruh fitur penyusunan perangkat di Kelas ${user.kelas}.`
              : `Lengkapi konfigurasi API Key Anda untuk mulai menyusun perangkat pembelajaran digital yang tersinkronisasi di Cloud.`}
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => onNavigate('CP')}
              disabled={!hasPersonalKey}
              className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-xl ${hasPersonalKey ? 'bg-white text-slate-900 hover:bg-blue-50' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
            >
              MULAI MENYUSUN <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const isCardLocked = !hasPersonalKey && !['DASHBOARD', 'USER', 'SETTING'].includes(card.id);
          return (
            <button
              key={card.id}
              disabled={isCardLocked}
              onClick={() => onNavigate(card.id)}
              className={`p-6 rounded-[32px] border transition-all hover:scale-[1.02] active:scale-95 group text-left shadow-sm ${isCardLocked ? 'opacity-40 grayscale cursor-not-allowed' : `hover:shadow-xl ${colorMap[card.color]}`}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl bg-white shadow-sm transition-all ${card.color === 'slate' ? 'text-slate-600' : ''}`}>
                  {isCardLocked ? <Lock size={24} /> : React.cloneElement(card.icon as React.ReactElement<any>, { size: 24 })}
                </div>
                {!isCardLocked && <ArrowRight className="opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" size={18} />}
              </div>
              <div>
                <p className="text-3xl font-black mb-1 tracking-tight">{card.count}</p>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{card.label}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
