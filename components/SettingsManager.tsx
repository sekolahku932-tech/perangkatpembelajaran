
import React, { useState, useEffect } from 'react';
import { SchoolSettings, AcademicYear, User } from '../types';
import { Save, Plus, Trash2, CheckCircle2, Building2, UserCircle, Calendar, Edit3, AlertTriangle, X, Loader2, Cloud, Sparkles, Key, Eye, EyeOff, Info } from 'lucide-react';
import { db, collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc, getDocs } from '../services/firebase';

interface SettingsManagerProps {
  user: User;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ user }) => {
  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: '',
    address: '',
    principalName: '',
    principalNip: ''
  });

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [newYear, setNewYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // AI Configuration State
  const [tempApiKey, setTempApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [aiStatus, setAiStatus] = useState<'DISCONNECTED' | 'CONNECTED'>('DISCONNECTED');
  const [isAiSaving, setIsAiSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubSettings = onSnapshot(doc(db, "settings", "school_info"), (snap) => {
      if (snap.exists()) setSettings(snap.data() as SchoolSettings);
    });

    const unsubYears = onSnapshot(collection(db, "academic_years"), (snap) => {
      const yearList = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as AcademicYear[];
      setYears(yearList.sort((a, b) => b.year.localeCompare(a.year)));
      setLoading(false);
    });

    // Ambil Kunci AI dari Database
    const unsubAi = onSnapshot(doc(db, "settings", "ai_config"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.key) {
          setTempApiKey(data.key);
          setAiStatus('CONNECTED');
        }
      }
    });

    return () => { unsubSettings(); unsubYears(); unsubAi(); };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "school_info"), settings);
      alert('Identitas sekolah diperbarui!');
    } catch (error) {
      alert('Gagal menyimpan ke database.');
    } finally {
      setSaving(false);
    }
  };

  const saveAiKeyToCloud = async () => {
    setIsAiSaving(true);
    try {
      if (tempApiKey.trim() === '') {
        await setDoc(doc(db, "settings", "ai_config"), { key: '' });
        setAiStatus('DISCONNECTED');
        alert('Kunci API dihapus. Fitur AI akan nonaktif untuk semua guru.');
      } else {
        // Simpan ke Cloud (Shared)
        await setDoc(doc(db, "settings", "ai_config"), { 
          key: tempApiKey.trim(),
          updatedBy: user.name,
          updatedAt: new Date().toISOString()
        });
        
        // Simpan ke Lokal sebagai backup
        localStorage.setItem('GEMINI_API_KEY', tempApiKey.trim());
        setAiStatus('CONNECTED');
        alert('Kunci API Berhasil disimpan di Cloud! Sekarang semua guru bisa menggunakan fitur AI.');
      }
    } catch (error) {
      alert('Gagal menyimpan kunci ke database Cloud. Pastikan Anda memiliki akses Admin.');
    } finally {
      setIsAiSaving(false);
    }
  };

  const addYear = async () => {
    if (!newYear) return;
    try {
      await addDoc(collection(db, "academic_years"), {
        year: newYear,
        isActive: years.length === 0
      });
      setNewYear('');
    } catch (error) { console.error(error); }
  };

  const activateYear = async (id: string) => {
    try {
      const colRef = collection(db, "academic_years");
      const querySnapshot = await colRef.get();
      const batchPromises = querySnapshot.docs.map((d: any) => 
        updateDoc(doc(db, "academic_years", d.id), { isActive: d.id === id })
      );
      await Promise.all(batchPromises);
    } catch (error) { console.error(error); }
  };

  if (loading) {
    return (
      <div className="py-40 flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 size={48} className="animate-spin text-blue-600" />
        <p className="font-black text-xs uppercase tracking-widest">Sinkronisasi Pengaturan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Hapus Tahun</h3>
              <p className="text-slate-500 font-medium text-sm">Hapus tahun pelajaran dari sistem Cloud?</p>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-slate-500 bg-white border border-slate-200">BATAL</button>
              <button onClick={async () => { await deleteDoc(doc(db, "academic_years", deleteConfirmId!)); setDeleteConfirmId(null); }} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-white bg-red-600 shadow-lg">HAPUS</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Configuration Section - SHARED CLOUD SOLUTION */}
      <div className="bg-white rounded-3xl shadow-xl border-2 border-indigo-100 overflow-hidden">
        <div className="p-6 border-b border-indigo-50 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight leading-none">Konfigurasi AI Global (Shared)</h3>
              <p className="text-[10px] text-indigo-600 font-bold uppercase mt-1">Satu Kunci untuk Seluruh Guru SDN 5 Bilato</p>
            </div>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 ${aiStatus === 'CONNECTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${aiStatus === 'CONNECTED' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            {aiStatus === 'CONNECTED' ? 'CLOUD AI AKTIF' : 'CLOUD AI MATI'}
          </div>
        </div>
        <div className="p-8">
           <div className="bg-slate-900 text-white p-6 rounded-2xl mb-8 flex flex-col md:flex-row items-center gap-6">
              <div className="shrink-0 p-4 bg-white/10 rounded-2xl border border-white/5 text-emerald-400">
                <Cloud size={32} />
              </div>
              <div className="space-y-1">
                 <p className="text-sm font-bold leading-relaxed">Kunci yang disimpan di sini akan tersimpan di database cloud.</p>
                 <p className="text-xs text-slate-400">Anda tidak perlu lagi mengatur Environment Variables di Netlify/Vercel. Begitu kunci disimpan, AI asisten akan aktif di semua akun guru.</p>
              </div>
           </div>

           <div className="max-w-2xl">
              <label className="block text-xs font-black text-slate-500 uppercase mb-3 ml-1 tracking-widest">Masukkan Gemini API Key Sekolah</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                   <input 
                    type={showKey ? "text" : "password"}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 pl-5 pr-12 text-sm font-black text-slate-800 focus:border-indigo-600 transition-all outline-none"
                    placeholder="Masukkan kunci AIzaSy..."
                    value={tempApiKey}
                    onChange={e => setTempApiKey(e.target.value)}
                   />
                   <button 
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                   >
                    {showKey ? <EyeOff size={18}/> : <Eye size={18}/>}
                   </button>
                </div>
                <button 
                  onClick={saveAiKeyToCloud}
                  disabled={isAiSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAiSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>} 
                  SIMPAN KE CLOUD
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 text-slate-400 text-[10px] font-medium bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                <Info size={14}/>
                Kunci ini dibagikan ke seluruh staf guru. Dapatkan di <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-600 underline font-bold">Google AI Studio</a>.
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Building2 size={20} />
              </div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight">Identitas Sekolah Cloud</h3>
            </div>
            <Cloud size={16} className="text-blue-500" />
          </div>
          <form onSubmit={handleSaveSettings} className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nama Satuan Pendidikan</label>
              <input type="text" className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={settings.schoolName} onChange={e => setSettings({...settings, schoolName: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Alamat Sekolah</label>
              <textarea className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px]" value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} />
            </div>
            <div className="pt-4 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nama Kepala Sekolah</label>
                  <input type="text" className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" value={settings.principalName} onChange={e => setSettings({...settings, principalName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">NIP Kepala Sekolah</label>
                  <input type="text" className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" value={settings.principalNip} onChange={e => setSettings({...settings, principalNip: e.target.value})} />
                </div>
              </div>
            </div>
            <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} SIMPAN IDENTITAS
            </button>
          </form>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Calendar size={20} />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-tight">Tahun Pelajaran</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex gap-2">
              <input type="text" placeholder="Contoh: 2025/2026" className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-500 outline-none" value={newYear} onChange={e => setNewYear(e.target.value)} />
              <button onClick={addYear} className="bg-amber-500 hover:bg-amber-600 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-amber-50"><Plus size={20} /></button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <tr><th className="px-4 py-3">Tahun</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-right">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {years.map(y => (
                    <tr key={y.id} className={y.isActive ? 'bg-amber-50/30' : ''}>
                      <td className="px-4 py-4"><span className="text-sm font-bold text-slate-700">{y.year}</span></td>
                      <td className="px-4 py-4 text-center">{y.isActive ? <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black">AKTIF</span> : <button onClick={() => activateYear(y.id)} className="text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase tracking-tighter transition-colors">Aktifkan</button>}</td>
                      <td className="px-4 py-4 text-right"><button onClick={() => setDeleteConfirmId(y.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;
