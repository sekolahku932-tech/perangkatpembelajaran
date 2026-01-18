
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Fase, CapaianPembelajaran, MATA_PELAJARAN, SchoolSettings, User } from '../types';
import { Plus, Edit2, Trash2, Save, X, Loader2, Cloud, AlertTriangle, Eye, EyeOff, Printer, FileDown, AlertCircle, BookOpen, Lock } from 'lucide-react';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from '../services/firebase';

interface CPManagerProps {
  user: User;
}

const CPManager: React.FC<CPManagerProps> = ({ user }) => {
  const [cps, setCps] = useState<CapaianPembelajaran[]>([]);
  const [loading, setLoading] = useState(true);
  const filterFase = Fase.C; // Locked to Fase C
  const filterKelas = '5'; // Locked to Class 5
  const [filterMapel, setFilterMapel] = useState<string>(MATA_PELAJARAN[0]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [formData, setFormData] = useState<Partial<CapaianPembelajaran>>({
    fase: Fase.C,
    mataPelajaran: MATA_PELAJARAN[0],
    kode: '',
    elemen: '',
    deskripsi: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: 'SDN SONDANA',
    address: 'Kecamatan Bilato, Kabupaten Gorontalo',
    principalName: 'Nama Kepala Sekolah',
    principalNip: '-'
  });

  useEffect(() => {
    setLoading(true);
    const unsubSettings = onSnapshot(doc(db, "settings", "school_info"), (snap) => {
      if (snap.exists()) setSettings(snap.data() as SchoolSettings);
    });

    const cpsCollection = collection(db, "cps");
    const unsubscribe = onSnapshot(cpsCollection, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CapaianPembelajaran[];
      setCps(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      setLoading(false);
    });

    return () => { unsubSettings(); unsubscribe(); };
  }, []);

  // FIX: If guru has no assigned mapel, show all by default
  const availableMapel = useMemo(() => {
    if (user.role === 'admin' || !user.mapelDiampu || user.mapelDiampu.length === 0) {
      return MATA_PELAJARAN;
    }
    return user.mapelDiampu;
  }, [user]);

  useEffect(() => {
    if (!availableMapel.includes(filterMapel)) {
      setFilterMapel(availableMapel[0]);
    }
  }, [availableMapel]);

  const filteredCps = cps.filter(cp => cp.fase === filterFase && cp.mataPelajaran === filterMapel);

  const handleExportWord = () => {
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Export Word</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid black; padding: 8px; font-family: 'Arial'; font-size: 11px; }
        .text-center { text-align: center; }
      </style>
      </head><body>
    `;
    const footer = "</body></html>";
    
    let tableHtml = `
      <div style="text-align:center">
        <h2 style="margin:0">CAPAIAN PEMBELAJARAN (CP)</h2>
        <h3 style="margin:5px 0">${settings.schoolName}</h3>
        <p style="font-size:10px">MAPEL: ${filterMapel} | FASE: ${filterFase}</p>
      </div>
      <br/>
      <table>
        <thead>
          <tr style="background-color: #f3f4f6">
            <th style="width:30px">NO</th>
            <th style="width:80px">KODE</th>
            <th style="width:150px">ELEMEN</th>
            <th>DESKRIPSI CAPAIAN PEMBELAJARAN</th>
          </tr>
        </thead>
        <tbody>
          ${filteredCps.map((cp, idx) => `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td class="text-center">${cp.kode}</td>
              <td><b>${cp.elemen}</b></td>
              <td>${cp.deskripsi}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const blob = new Blob(['\ufeff', header + tableHtml + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CP_${filterMapel}_${filterFase}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAddOrUpdate = async () => {
    if (!formData.kode || !formData.elemen || !formData.deskripsi) return;
    try {
      if (isEditing) {
        await updateDoc(doc(db, "cps", isEditing), { ...formData, fase: filterFase, mataPelajaran: filterMapel });
        setIsEditing(null);
      } else {
        await addDoc(collection(db, "cps"), { fase: filterFase, mataPelajaran: filterMapel, kode: formData.kode, elemen: formData.elemen, deskripsi: formData.deskripsi });
      }
      setFormData({ ...formData, kode: '', elemen: '', deskripsi: '' });
    } catch (error) { console.error(error); }
  };

  const startEdit = (cp: CapaianPembelajaran) => { setIsEditing(cp.id); setFormData(cp); };

  const deleteCp = async () => {
    if (!deleteConfirm) return;
    try { await deleteDoc(doc(db, "cps", deleteConfirm)); setDeleteConfirm(null); } catch (error) { console.error(error); }
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak CP - SDN SONDANA</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Inter', sans-serif; background: white; padding: 40px; }
              @media print { .no-print { display: none !important; } body { padding: 0; } }
              table { border-collapse: collapse; }
              .break-inside-avoid { page-break-inside: avoid; }
            </style>
          </head>
          <body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
            ${content}
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Hapus CP</h3>
              <p className="text-slate-500 font-medium text-sm">Hapus data Capaian Pembelajaran ini dari database?</p>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-slate-500 bg-white border border-slate-200">BATAL</button>
              <button onClick={deleteCp} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-white bg-red-600">YA, HAPUS</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><BookOpen size={24} /></div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">CAPAIAN PEMBELAJARAN (CP)</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Status: Data Cloud Sinkron</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsPrintMode(true)} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-black shadow-lg transition-all"><Eye size={18} /> PRATINJAU</button>
            <button onClick={handleExportWord} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg transition-all"><FileDown size={18} /> WORD</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[24px] border border-slate-100">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-1">Fase (Terkunci) <Lock size={10} className="text-amber-500" /></label>
            <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm font-black text-slate-500">
              FASE C
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Pilih Mata Pelajaran</label>
            <select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500" value={filterMapel} onChange={(e) => setFilterMapel(e.target.value)}>
              {availableMapel.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1 bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
          <div className={`p-6 border-b border-slate-100 flex items-center justify-between transition-colors ${isEditing ? 'bg-amber-50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isEditing ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                {isEditing ? <Edit2 size={20} /> : <Plus size={20} />}
              </div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight">{isEditing ? 'Edit Data CP' : 'Tambah CP Baru'}</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Kode CP</label><input className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase" value={formData.kode} onChange={e => setFormData({ ...formData, kode: e.target.value })} placeholder="C1, B2, dst..." /></div>
            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Elemen</label><input className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={formData.elemen} onChange={e => setFormData({ ...formData, elemen: e.target.value })} placeholder="Nama Elemen..." /></div>
            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Deskripsi CP</label><textarea className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[200px]" value={formData.deskripsi} onChange={e => setFormData({ ...formData, deskripsi: e.target.value })} placeholder="Salin deskripsi CP di sini..." /></div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleAddOrUpdate} className={`flex-1 text-white font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest ${isEditing ? 'bg-amber-600' : 'bg-blue-600'}`}>
                <Save size={18} /> {isEditing ? 'UPDATE' : 'SIMPAN'}
              </button>
              {isEditing && <button onClick={() => { setIsEditing(null); setFormData({ ...formData, kode: '', elemen: '', deskripsi: '' }); }} className="bg-slate-100 text-slate-600 p-4 rounded-xl"><X size={18} /></button>}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest h-12">
                    <th className="px-6 py-2 w-16 text-center">No</th>
                    <th className="px-6 py-2 w-24">Kode</th>
                    <th className="px-6 py-2 w-48">Elemen</th>
                    <th className="px-6 py-2">Deskripsi CP</th>
                    <th className="px-6 py-2 w-24 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin inline-block text-blue-600" /></td></tr>
                  ) : filteredCps.length === 0 ? (
                    <tr><td colSpan={5} className="py-32 text-center text-slate-300 font-bold uppercase text-xs tracking-widest">Belum ada data CP untuk Mapel ini</td></tr>
                  ) : filteredCps.map((cp, idx) => (
                    <tr key={cp.id} className="group hover:bg-slate-50 transition-colors align-top">
                      <td className="px-6 py-6 text-center font-black text-slate-300">{idx + 1}</td>
                      <td className="px-6 py-6 font-black text-xs text-blue-600 uppercase">{cp.kode}</td>
                      <td className="px-6 py-6 font-black text-xs text-slate-900 uppercase leading-tight">{cp.elemen}</td>
                      <td className="px-6 py-6 text-[11px] leading-relaxed text-slate-600 text-justify italic">"{cp.deskripsi}"</td>
                      <td className="px-6 py-6 text-center">
                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(cp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                          <button onClick={() => setDeleteConfirm(cp.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
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

export default CPManager;
