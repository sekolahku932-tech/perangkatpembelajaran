
import React, { useState, useEffect } from 'react';
import { SchoolSettings, AcademicYear, User } from '../types';
import { Save, Plus, Trash2, CheckCircle2, Building2, UserCircle, Calendar, Edit3, AlertTriangle, X, Loader2, Cloud } from 'lucide-react';
import { db, collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc, getDocs } from '../services/firebase';

// Add props interface for SettingsManager
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

  useEffect(() => {
    setLoading(true);
    // 1. Sinkronisasi Identitas Sekolah
    const unsubSettings = onSnapshot(doc(db, "settings", "school_info"), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SchoolSettings);
      } else {
        // Default jika data belum ada di Cloud
        setSettings({
          schoolName: 'SD NEGERI 5 BILATO',
          address: 'Kecamatan Bilato, Kabupaten Gorontalo',
          principalName: 'Nama Kepala Sekolah, S.Pd',
          principalNip: '19XXXXXXXXXXXXXXX'
        });
      }
    });

    // 2. Sinkronisasi Tahun Pelajaran
    const unsubYears = onSnapshot(collection(db, "academic_years"), (snap) => {
      const yearList = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as AcademicYear[];
      setYears(yearList.sort((a, b) => b.year.localeCompare(a.year)));
      setLoading(false);
    });

    return () => {
      unsubSettings();
      unsubYears();
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Simpan langsung ke dokumen tunggal school_info
      await setDoc(doc(db, "settings", "school_info"), settings);
      alert('Identitas sekolah berhasil diperbarui di Cloud!');
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan identitas ke database.');
    } finally {
      setSaving(false);
    }
  };

  const addYear = async () => {
    if (!newYear) return;
    try {
      await addDoc(collection(db, "academic_years"), {
        year: newYear,
        isActive: years.length === 0 // Otomatis aktif jika ini tahun pertama
      });
      setNewYear('');
    } catch (error) {
      console.error(error);
      alert('Gagal menambah tahun pelajaran.');
    }
  };

  const activateYear = async (id: string) => {
    try {
      // Ambil semua tahun pelajaran
      const colRef = collection(db, "academic_years");
      const querySnapshot = await colRef.get();
      
      const batchPromises = querySnapshot.docs.map((d: any) => 
        updateDoc(doc(db, "academic_years", d.id), { isActive: d.id === id })
      );
      
      await Promise.all(batchPromises);
    } catch (error) {
      console.error(error);
      alert('Gagal mengaktifkan tahun pelajaran.');
    }
  };

  const executeDeleteYear = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, "academic_years", deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error(error);
      alert('Gagal menghapus data.');
    }
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Hapus Tahun</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">Apakah Anda yakin ingin menghapus tahun pelajaran ini dari sistem Cloud?</p>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 transition-all">BATAL</button>
              <button onClick={executeDeleteYear} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg">HAPUS</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Building2 size={20} />
              </div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight">Identitas Sekolah Cloud</h3>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase">
              <Cloud size={10} /> Sinkron
            </div>
          </div>
          <form onSubmit={handleSaveSettings} className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nama Satuan Pendidikan</label>
              <input 
                type="text" 
                className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={settings.schoolName}
                onChange={e => setSettings({...settings, schoolName: e.target.value.toUpperCase()})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Alamat Sekolah</label>
              <textarea 
                className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px]"
                value={settings.address}
                onChange={e => setSettings({...settings, address: e.target.value})}
              />
            </div>
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <UserCircle size={18} className="text-slate-400" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Kepala Sekolah</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    value={settings.principalName}
                    onChange={e => setSettings({...settings, principalName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">NIP</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    value={settings.principalNip}
                    onChange={e => setSettings({...settings, principalNip: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
              {saving ? 'MENYIMPAN...' : 'SIMPAN KE CLOUD'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Calendar size={20} />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-tight">Tahun Pelajaran (Database)</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Contoh: 2025/2026"
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                value={newYear}
                onChange={e => setNewYear(e.target.value)}
              />
              <button 
                onClick={addYear}
                className="bg-amber-500 hover:bg-amber-600 text-white p-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-50"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Tahun Pelajaran</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {years.map(y => (
                    <tr key={y.id} className={`group ${y.isActive ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-4">
                        <span className={`text-sm font-bold ${y.isActive ? 'text-amber-700' : 'text-slate-700'}`}>{y.year}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {y.isActive ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                            <CheckCircle2 size={10} /> Aktif
                          </span>
                        ) : (
                          <button 
                            onClick={() => activateYear(y.id)}
                            className="text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase tracking-tighter transition-colors"
                          >
                            Aktifkan
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setDeleteConfirmId(y.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
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
