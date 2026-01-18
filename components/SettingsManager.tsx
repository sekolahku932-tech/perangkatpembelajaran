
import React, { useState, useEffect } from 'react';
import { SchoolSettings, AcademicYear, User } from '../types';
import { Save, Plus, Trash2, Building2, Calendar, AlertTriangle, Loader2, Cloud, Sparkles, Key, Eye, EyeOff, Info, GraduationCap, X } from 'lucide-react';
import { db, collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc } from '../services/firebase';

interface SettingsManagerProps {
  user: User;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ user }) => {
  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: 'SDN SONDANA', address: '', principalName: '', principalNip: ''
  });

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [newYear, setNewYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddingYear, setIsAddingYear] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubSettings = onSnapshot(doc(db, "settings", "school_info"), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SchoolSettings;
        setSettings({ ...data, schoolName: 'SDN SONDANA' }); // Enforce name
      }
    });

    const unsubYears = onSnapshot(collection(db, "academic_years"), (snap) => {
      const yearList = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as AcademicYear[];
      setYears(yearList.sort((a, b) => b.year.localeCompare(a.year)));
      setLoading(false);
    });

    return () => { unsubSettings(); unsubYears(); };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "school_info"), { ...settings, schoolName: 'SDN SONDANA' });
      alert('Identitas sekolah diperbarui!');
    } catch (error) {
      alert('Gagal menyimpan ke database.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddYear = async () => {
    if (!newYear.trim()) {
      alert('Format tahun harus diisi (Contoh: 2025/2026)');
      return;
    }
    
    // Cek duplikasi
    if (years.some(y => y.year === newYear.trim())) {
      alert('Tahun pelajaran ini sudah ada dalam daftar.');
      return;
    }

    try {
      await addDoc(collection(db, "academic_years"), {
        year: newYear.trim(),
        isActive: false
      });
      setNewYear('');
      setIsAddingYear(false);
    } catch (e) {
      alert('Gagal menambah tahun pelajaran.');
    }
  };

  const handleDeleteYear = async (id: string, year: string) => {
    if (!confirm(`Hapus Tahun Pelajaran ${year} dari sistem? Semua data yang terikat mungkin akan terpengaruh.`)) return;
    try {
      await deleteDoc(doc(db, "academic_years", id));
    } catch (e) {
      alert('Gagal menghapus data.');
    }
  };

  const handleToggleYear = async (id: string, currentStatus: boolean) => {
    if (currentStatus) return; // Tidak bisa menonaktifkan tahun yang aktif (harus mengaktifkan yang lain)
    
    try {
      // Nonaktifkan semua tahun terlebih dahulu
      const updates = years.map(y => updateDoc(doc(db, "academic_years", y.id), { isActive: false }));
      await Promise.all(updates);
      
      // Aktifkan tahun terpilih
      await updateDoc(doc(db, "academic_years", id), { isActive: true });
    } catch (e) { console.error(e); }
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Building2 size={20} />
              </div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight">Identitas Sekolah Cloud</h3>
            </div>
          </div>
          <form onSubmit={handleSaveSettings} className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nama Satuan Pendidikan (Terkunci)</label>
              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm font-black text-slate-600">
                SDN SONDANA
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nama Kepala Sekolah</label>
              <input type="text" className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" value={settings.principalName} onChange={e => setSettings({...settings, principalName: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">NIP Kepala Sekolah</label>
              <input type="text" className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" value={settings.principalNip} onChange={e => setSettings({...settings, principalNip: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Alamat Sekolah</label>
              <textarea className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]" value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} SIMPAN IDENTITAS
            </button>
          </form>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                <Calendar size={20} />
              </div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight">Tahun Pelajaran</h3>
            </div>
            <button 
              onClick={() => setIsAddingYear(!isAddingYear)}
              className="p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all shadow-md"
            >
              {isAddingYear ? <X size={18}/> : <Plus size={18} />}
            </button>
          </div>
          <div className="p-6 space-y-6">
            {isAddingYear && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in slide-in-from-top-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Tambah Tahun Baru</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Contoh: 2025/2026" 
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                    value={newYear}
                    onChange={e => setNewYear(e.target.value)}
                  />
                  <button 
                    onClick={handleAddYear}
                    className="bg-amber-600 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg"
                  >
                    SIMPAN
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Tahun</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {years.map(y => (
                    <tr key={y.id} className={y.isActive ? 'bg-amber-50/30' : ''}>
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-slate-700">{y.year}</span>
                        {y.isActive && <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded uppercase">Sedang Digunakan</span>}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button 
                          onClick={() => handleToggleYear(y.id, y.isActive)}
                          className={`${y.isActive ? 'bg-amber-600 text-white shadow-inner' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'} px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all`}
                        >
                          {y.isActive ? 'AKTIF' : 'AKTIFKAN'}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          disabled={y.isActive}
                          onClick={() => handleDeleteYear(y.id, y.year)}
                          className={`p-2 rounded-lg transition-all ${y.isActive ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-red-600 hover:bg-red-50'}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {years.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-slate-400 italic text-sm">Belum ada data tahun pelajaran.</td>
                    </tr>
                  )}
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
