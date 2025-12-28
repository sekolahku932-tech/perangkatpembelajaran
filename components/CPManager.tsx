
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Fase, CapaianPembelajaran, MATA_PELAJARAN, SchoolSettings, User } from '../types';
import { Plus, Edit2, Trash2, Save, X, Loader2, Cloud, AlertTriangle, Eye, EyeOff, Printer, FileDown, AlertCircle, BookOpen } from 'lucide-react';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from '../services/firebase';

interface CPManagerProps {
  user: User;
}

const CPManager: React.FC<CPManagerProps> = ({ user }) => {
  const [cps, setCps] = useState<CapaianPembelajaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFase, setFilterFase] = useState<Fase>(Fase.A);
  const [filterMapel, setFilterMapel] = useState<string>(MATA_PELAJARAN[0]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [formData, setFormData] = useState<Partial<CapaianPembelajaran>>({
    fase: Fase.A,
    mataPelajaran: MATA_PELAJARAN[0],
    kode: '',
    elemen: '',
    deskripsi: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: 'SD NEGERI 5 BILATO',
    address: 'Kecamatan Bilato, Kabupaten Gorontalo',
    principalName: 'Nama Kepala Sekolah',
    principalNip: '-'
  });

  useEffect(() => {
    if (user.role === 'guru') {
      if (user.mapelDiampu && user.mapelDiampu.length > 0) {
        setFilterMapel(user.mapelDiampu[0]);
      }
      if (['1', '2'].includes(user.kelas)) setFilterFase(Fase.A);
      else if (['3', '4'].includes(user.kelas)) setFilterFase(Fase.B);
      else if (['5', '6'].includes(user.kelas)) setFilterFase(Fase.C);
    }
  }, [user]);

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
  };

  const handleAddOrUpdate = async () => {
    if (!formData.kode || !formData.elemen || !formData.deskripsi) return;

    try {
      if (isEditing) {
        const cpRef = doc(db, "cps", isEditing);
        await updateDoc(cpRef, {
          ...formData,
          fase: filterFase,
          mataPelajaran: filterMapel
        });
        setIsEditing(null);
      } else {
        await addDoc(collection(db, "cps"), {
          fase: filterFase,
          mataPelajaran: filterMapel,
          kode: formData.kode,
          elemen: formData.elemen,
          deskripsi: formData.deskripsi
        });
      }
      setFormData({ ...formData, kode: '', elemen: '', deskripsi: '' });
    } catch (error) {
      console.error("Error saving to Firestore:", error);
    }
  };

  const startEdit = (cp: CapaianPembelajaran) => {
    setIsEditing(cp.id);
    setFormData(cp);
  };

  const deleteCp = async () => {
    if (!deleteConfirm) return;
    try {
      const cpRef = doc(db, "cps", deleteConfirm);
      await deleteDoc(cpRef);
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting from Firestore:", error);
    }
  };

  const filteredCps = cps.filter(cp => cp.fase === filterFase && cp.mataPelajaran === filterMapel);
  const availableMapel = user.role === 'admin' ? MATA_PELAJARAN : user.mapelDiampu;

  // FIX: Completed the truncated handlePrint function and added missing JSX/export
  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak CP - SDN 5 Bilato</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Inter', sans-serif; background: white; padding: 40px; }
              @media print { 
                .no-print { display: none !important; }
                body { padding: 0; }
              }
              table { border-collapse: collapse; width: 100%; border: 2px solid black; }
              th, td { border: 1px solid black; padding: 5px; }
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

  if (isPrintMode) {
    return (
      <div className="bg-white p-12 min-h-screen text-slate-900 font-serif">
        <div className="no-print fixed top-6 right-6 flex gap-3 z-[300]">
          <button onClick={() => setIsPrintMode(false)} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xl hover:bg-black transition-all">
            <EyeOff size={16}/> KEMBALI
          </button>
          <button onClick={handlePrint} className="bg-rose-600 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xl hover:bg-rose-700 transition-all">
            <Printer size={16}/> CETAK PDF
          </button>
        </div>

        <div ref={printRef}>
          <div className="text-center mb-10">
            <h1 className="text-2xl font-black uppercase border-b-4 border-black pb-2 inline-block tracking-tight text-slate-900">Capaian Pembelajaran (CP)</h1>
            <h2 className="text-xl font-bold mt-3 uppercase text-slate-800">{settings.schoolName}</h2>
            <div className="flex justify-center gap-10 mt-6 text-xs font-black uppercase tracking-widest text-slate-600 font-sans">
              <span>MAPEL: {filterMapel}</span>
              <span>FASE: {filterFase}</span>
            </div>
          </div>

          <table className="w-full border-collapse border-2 border-black text-[11px]">
            <thead>
              <tr className="bg-slate-50 h-12 uppercase font-black text-center">
                <th className="border-2 border-black w-[5%]">NO</th>
                <th className="border-2 border-black w-[15%]">KODE</th>
                <th className="border-2 border-black w-[25%] text-left px-4">ELEMEN</th>
                <th className="border-2 border-black text-left px-4">DESKRIPSI CAPAIAN PEMBELAJARAN</th>
              </tr>
            </thead>
            <tbody>
              {filteredCps.map((cp, idx) => (
                <tr key={cp.id}>
                  <td className="border-2 border-black p-3 text-center font-bold">{idx + 1}</td>
                  <td className="border-2 border-black p-3 text-center font-black">{cp.kode}</td>
                  <td className="border-2 border-black p-3 font-bold uppercase">{cp.elemen}</td>
                  <td className="border-2 border-black p-3 leading-relaxed text-justify">{cp.deskripsi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Hapus CP</h3>
              <p className="text-slate-500 font-medium text-sm">Apakah Anda yakin ingin menghapus Capaian Pembelajaran ini?</p>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-slate-500 bg-white border border-slate-200">BATAL</button>
              <button onClick={deleteCp} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-white bg-red-600">HAPUS</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><BookOpen size={24} /></div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Capaian Pembelajaran (CP)</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Data Kurikulum Nasional SD</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsPrintMode(true)} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-black shadow-lg transition-all"><Eye size={18} /> PRATINJAU</button>
            <button onClick={handleExportWord} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg transition-all"><FileDown size={18} /> WORD</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[24px] border border-slate-100 mb-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Pilih Fase</label>
            <select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none" value={filterFase} onChange={(e) => setFilterFase(e.target.value as Fase)}>
              {Object.values(Fase).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Pilih Mata Pelajaran</label>
            <select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none" value={filterMapel} onChange={(e) => setFilterMapel(e.target.value)}>
              {availableMapel.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="p-6 bg-white border-2 border-dashed border-slate-200 rounded-[32px] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none" placeholder="Kode CP (e.g. CP1)" value={formData.kode} onChange={e => setFormData({...formData, kode: e.target.value})} />
            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none uppercase md:col-span-2" placeholder="Nama Elemen" value={formData.elemen} onChange={e => setFormData({...formData, elemen: e.target.value})} />
          </div>
          <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none min-h-[100px]" placeholder="Deskripsi Capaian Pembelajaran" value={formData.deskripsi} onChange={e => setFormData({...formData, deskripsi: e.target.value})} />
          <div className="flex justify-end gap-2">
            {isEditing && <button onClick={() => { setIsEditing(null); setFormData({ kode: '', elemen: '', deskripsi: '' }); }} className="px-6 py-2.5 rounded-xl text-xs font-black text-slate-500 bg-slate-100">BATAL</button>}
            <button onClick={handleAddOrUpdate} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg">
              {isEditing ? <Save size={16}/> : <Plus size={16}/>} {isEditing ? 'UPDATE CP' : 'TAMBAH CP'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <div className="flex items-center gap-3">
             <AlertCircle size={20} className="text-blue-600"/>
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Daftar CP: {filterMapel} ({filterFase})</h3>
           </div>
           <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black text-slate-400 uppercase">
             <Cloud size={10}/> Data Cloud Aktif
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest h-12">
                <th className="px-6 py-2 w-[5%] text-center">No</th>
                <th className="px-6 py-2 w-[10%] text-center">Kode</th>
                <th className="px-6 py-2 w-[20%]">Elemen</th>
                <th className="px-6 py-2 w-[50%]">Deskripsi</th>
                <th className="px-6 py-2 w-[15%] text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="py-32 text-center"><Loader2 className="animate-spin inline-block text-blue-600" /></td></tr>
              ) : filteredCps.length === 0 ? (
                <tr><td colSpan={5} className="py-32 text-center text-slate-300 font-bold uppercase text-xs tracking-widest">Belum ada data CP untuk filter ini</td></tr>
              ) : filteredCps.map((cp, idx) => (
                <tr key={cp.id} className="group hover:bg-slate-50/50 transition-colors align-top">
                  <td className="px-6 py-6 text-center font-black text-slate-300">{idx + 1}</td>
                  <td className="px-6 py-6 text-center"><span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black text-slate-600">{cp.kode}</span></td>
                  <td className="px-6 py-6 font-black text-[10px] text-slate-900 uppercase leading-tight">{cp.elemen}</td>
                  <td className="px-6 py-6 text-xs text-slate-600 leading-relaxed text-justify italic">{cp.deskripsi}</td>
                  <td className="px-6 py-6 text-center">
                    <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(cp)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit2 size={16}/></button>
                      <button onClick={() => setDeleteConfirm(cp.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CPManager;
