
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Fase, Kelas, ATPItem, AnalisisCP, CapaianPembelajaran, MATA_PELAJARAN, SchoolSettings, User, DIMENSI_PROFIL } from '../types';
import { Plus, Trash2, Sparkles, Loader2, Save, Eye, EyeOff, Search, CheckCircle2, X, AlertTriangle, RefreshCcw, Info, ClipboardCopy, Cloud, DownloadCloud, FileDown, Printer, Edit2, Wand2, Lock, ListTree, Copy, AlertCircle } from 'lucide-react';
import { completeATPDetails } from '../services/geminiService';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from '../services/firebase';

interface ATPManagerProps {
  user: User;
}

const ATPManager: React.FC<ATPManagerProps> = ({ user }) => {
  const [atpData, setAtpData] = useState<ATPItem[]>([]);
  const [cps, setCps] = useState<CapaianPembelajaran[]>([]);
  const [allAnalisis, setAllAnalisis] = useState<AnalisisCP[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const [filterFase, setFilterFase] = useState<Fase>(Fase.A);
  const [filterKelas, setFilterKelas] = useState<Kelas>('1');
  const [filterMapel, setFilterMapel] = useState<string>(MATA_PELAJARAN[0]);
  
  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: 'SD NEGERI 5 BILATO',
    address: 'Kecamatan Bilato, Kabupaten Gorontalo',
    principalName: 'Nama Kepala Sekolah',
    principalNip: '-'
  });

  const [activeYear, setActiveYear] = useState('2024/2025');
  const printRef = useRef<HTMLDivElement>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (user.role === 'guru') {
      if (user.kelas !== '-' && user.kelas !== 'Multikelas') {
        setFilterKelas(user.kelas as Kelas);
        updateFaseByKelas(user.kelas as Kelas);
      }
      if (user.mapelDiampu && user.mapelDiampu.length > 0) {
        if (!user.mapelDiampu.includes(filterMapel)) {
          setFilterMapel(user.mapelDiampu[0]);
        }
      }
    }
  }, [user]);

  const updateFaseByKelas = (kls: Kelas) => {
    if (['1', '2'].includes(kls)) setFilterFase(Fase.A);
    else if (['3', '4'].includes(kls)) setFilterFase(Fase.B);
    else if (['5', '6'].includes(kls)) setFilterFase(Fase.C);
  };

  const handleKelasChange = (kls: Kelas) => {
    setFilterKelas(kls);
    updateFaseByKelas(kls);
  };

  useEffect(() => {
    setLoading(true);
    const unsubSettings = onSnapshot(doc(db, "settings", "school_info"), (snap) => {
      if (snap.exists()) setSettings(snap.data() as SchoolSettings);
    });

    const unsubYears = onSnapshot(collection(db, "academic_years"), (snap) => {
      const active = snap.docs.find((d: any) => d.data().isActive);
      if (active) setActiveYear(active.data().year);
    });

    const unsubATP = onSnapshot(collection(db, "atp"), (snap) => {
      setAtpData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ATPItem[]);
    });

    const unsubCp = onSnapshot(collection(db, "cps"), snap => {
      setCps(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CapaianPembelajaran[]);
    });

    const unsubAnalisis = onSnapshot(collection(db, "analisis"), snap => {
      setAllAnalisis(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AnalisisCP[]);
      setLoading(false);
    });

    return () => { unsubSettings(); unsubYears(); unsubATP(); unsubCp(); unsubAnalisis(); };
  }, []);

  const filteredAtp = useMemo(() => {
    return atpData
      .filter(item => item.fase === filterFase && item.kelas === filterKelas && item.mataPelajaran === filterMapel)
      .sort((a, b) => (a.indexOrder || 0) - (b.indexOrder || 0));
  }, [atpData, filterFase, filterKelas, filterMapel]);

  const handleSyncFromAnalisis = async () => {
    setLoading(true);
    try {
      const sourceAnalisis = allAnalisis.filter(a => 
        a.fase === filterFase && 
        a.kelas === filterKelas && 
        a.mataPelajaran.trim().toLowerCase() === filterMapel.trim().toLowerCase()
      );

      if (sourceAnalisis.length === 0) {
        setMessage({ text: 'Tidak ada data analisis untuk filter ini. Selesaikan Analisis CP-TP terlebih dahulu.', type: 'error' });
        setLoading(false);
        return;
      }

      let count = 0;
      for (const a of sourceAnalisis) {
        const alreadyExists = atpData.some(atp => 
          atp.tujuanPembelajaran === a.tujuanPembelajaran && 
          atp.kelas === filterKelas && 
          atp.mataPelajaran === filterMapel
        );

        if (!alreadyExists) {
          const cpInfo = cps.find(cp => cp.id === a.cpId);
          await addDoc(collection(db, "atp"), {
            fase: a.fase,
            kelas: a.kelas,
            mataPelajaran: a.mataPelajaran,
            elemen: cpInfo?.elemen || '-',
            capaianPembelajaran: cpInfo?.deskripsi || '-',
            materi: a.materi,
            subMateri: a.subMateri || '',
            tujuanPembelajaran: a.tujuanPembelajaran,
            alurTujuanPembelajaran: '',
            alokasiWaktu: '',
            dimensiProfilLulusan: '',
            asesmenAwal: '',
            asesmenProses: '',
            asesmenAkhir: '',
            sumberBelajar: '',
            indexOrder: a.indexOrder || 0
          });
          count++;
        }
      }
      setMessage({ text: `Berhasil menarik ${count} data baru dari Analisis CP ke ATP.`, type: 'success' });
    } catch (err) {
      setMessage({ text: 'Gagal sinkronisasi data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAIComplete = async (id: string) => {
    const item = atpData.find(i => i.id === id);
    if (!item || !item.tujuanPembelajaran) return;
    setIsProcessingId(id);
    try {
      const suggestions = await completeATPDetails(item.tujuanPembelajaran, item.materi, item.kelas, user.apiKey);
      if (suggestions) {
        // Pembersihan tambahan dimensi profil untuk memastikan hanya 3 jika AI memberikan lebih
        let dimensions = suggestions.dimensiOfProfil || '';
        const parts = dimensions.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
        if (parts.length > 3) {
            dimensions = parts.slice(0, 3).join(', ');
        }

        await updateDoc(doc(db, "atp", id), {
          alurTujuanPembelajaran: suggestions.alurTujuan,
          alokasiWaktu: suggestions.alokasiWaktu,
          dimensiProfilLulusan: dimensions,
          asesmenAwal: suggestions.asesmenAwal,
          asesmenProses: suggestions.asesmenProses,
          asesmenAkhir: suggestions.asesmenAkhir,
          sumberBelajar: suggestions.sumberBelajar
        });
        setMessage({ text: 'Detail ATP berhasil dilengkapi (Maks 3 Dimensi).', type: 'success' });
      }
    } catch (err) {
      setMessage({ text: 'Gagal menghubungi AI. Periksa kuota API Key.', type: 'error' });
    } finally { setIsProcessingId(null); }
  };

  const updateField = async (id: string, field: keyof ATPItem, value: any) => {
    try { await updateDoc(doc(db, "atp", id), { [field]: value }); } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, "atp", deleteConfirmId));
      setDeleteConfirmId(null);
      setMessage({ text: 'Baris ATP dihapus.', type: 'info' });
    } catch (e) { console.error(e); }
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak ATP - SDN 5 Bilato</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Inter', sans-serif; background: white; padding: 40px; }
              @media print { 
                .no-print { display: none !important; }
                body { padding: 0; }
              }
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

  const handleExportWord = () => {
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Alur Tujuan Pembelajaran</title><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 5px; font-family: 'Arial'; font-size: 8pt; vertical-align: top; } .text-center { text-align: center; } .font-bold { font-weight: bold; } .bg-gray { background-color: #f3f4f6; }</style></head><body>`;
    const footer = "</body></html>";
    let tableHtml = `
      <div style="text-align:center">
        <h2 style="margin:0">ALUR TUJUAN PEMBELAJARAN (ATP)</h2>
        <h3 style="margin:5px 0">${settings.schoolName}</h3>
        <p style="font-size:10px">MATA PELAJARAN: ${filterMapel} | KELAS: ${filterKelas} | TAHUN: ${activeYear}</p>
      </div>
      <br/>
      <table>
        <thead>
          <tr class="bg-gray">
            <th style="width:30px">NO</th>
            <th>ELEMEN / CP</th>
            <th>TUJUAN PEMBELAJARAN (TP)</th>
            <th>ALUR TUJUAN PEMBELAJARAN (ATP)</th>
            <th>MATERI</th>
            <th>AW</th>
            <th>PROFIL LULUSAN</th>
            <th>ASESMEN</th>
          </tr>
        </thead>
        <tbody>
          ${filteredAtp.map((item, idx) => `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td><b>${item.elemen}</b><br/>${item.capaianPembelajaran}</td>
              <td>${item.tujuanPembelajaran}</td>
              <td>${item.alurTujuanPembelajaran}</td>
              <td>${item.materi}</td>
              <td class="text-center">${item.alokasiWaktu}</td>
              <td>${item.dimensiProfilLulusan}</td>
              <td><b>Awal:</b> ${item.asesmenAwal}<br/><b>Proses:</b> ${item.asesmenProses}<br/><b>Akhir:</b> ${item.asesmenAkhir}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    const blob = new Blob(['\ufeff', header + tableHtml + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ATP_${filterMapel.replace(/ /g, '_')}_KLS${filterKelas}.doc`;
    link.click();
  };

  const isClassLocked = user.role === 'guru' && user.teacherType === 'kelas';
  const availableMapel = user.role === 'admin' ? MATA_PELAJARAN : user.mapelDiampu;

  if (isPrintMode) {
    return (
      <div className="bg-white p-12 min-h-screen text-slate-900 font-serif">
        <div className="no-print fixed top-6 right-6 flex gap-3 z-[300]">
          <button onClick={() => setIsPrintMode(false)} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xl hover:bg-black transition-all">
            <EyeOff size={16}/> KEMBALI
          </button>
          <button onClick={handleExportWord} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xl hover:bg-blue-700 transition-all">
            <FileDown size={16}/> WORD
          </button>
          <button onClick={handlePrint} className="bg-rose-600 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xl hover:bg-rose-700 transition-all">
            <Printer size={16}/> CETAK PDF
          </button>
        </div>

        <div ref={printRef}>
          <div className="text-center mb-10">
            <h1 className="text-2xl font-black uppercase border-b-4 border-black pb-2 inline-block tracking-tight text-slate-900">Alur Tujuan Pembelajaran (ATP)</h1>
            <h2 className="text-xl font-bold mt-3 uppercase text-slate-800">{settings.schoolName}</h2>
            <div className="grid grid-cols-2 gap-x-20 mt-8 text-left text-xs font-bold uppercase font-sans">
               <div className="space-y-1">
                 <div className="flex"><span>Mata Pelajaran</span><span className="ml-4 mr-2">:</span><span>{filterMapel}</span></div>
                 <div className="flex"><span>Fase / Kelas</span><span className="ml-8 mr-2">:</span><span>{filterFase} / {filterKelas}</span></div>
               </div>
               <div className="space-y-1">
                 <div className="flex"><span>Tahun Pelajaran</span><span className="ml-4 mr-2">:</span><span>{activeYear}</span></div>
                 <div className="flex"><span>Penyusun</span><span className="ml-14 mr-2">:</span><span>{user.name}</span></div>
               </div>
            </div>
          </div>

          <table className="w-full border-collapse border-2 border-black text-[8px]">
            <thead>
              <tr className="bg-slate-50 h-12 uppercase font-black text-center">
                <th className="border-2 border-black w-8">NO</th>
                <th className="border-2 border-black px-2 text-left w-1/5">ELEMEN / CP</th>
                <th className="border-2 border-black px-2 text-left w-1/5">TUJUAN PEMBELAJARAN (TP)</th>
                <th className="border-2 border-black px-2 text-left w-1/5">ALUR TUJUAN (ATP)</th>
                <th className="border-2 border-black px-2 text-left">MATERI</th>
                <th className="border-2 border-black w-10">AW</th>
                <th className="border-2 border-black px-2 text-left">PROFIL LULUSAN</th>
                <th className="border-2 border-black px-2 text-left">ASESMEN</th>
              </tr>
            </thead>
            <tbody>
              {filteredAtp.length === 0 ? (
                <tr><td colSpan={8} className="border-2 border-black p-10 text-center italic text-slate-400">Data ATP Kosong.</td></tr>
              ) : (
                filteredAtp.map((item, idx) => (
                  <tr key={item.id} className="break-inside-avoid">
                    <td className="border-2 border-black p-1 text-center font-bold">{idx + 1}</td>
                    <td className="border-2 border-black p-2 leading-relaxed">
                      <p className="font-black uppercase mb-1">{item.elemen}</p>
                      <p className="italic text-slate-500">{item.capaianPembelajaran}</p>
                    </td>
                    <td className="border-2 border-black p-2 leading-relaxed">{item.tujuanPembelajaran}</td>
                    <td className="border-2 border-black p-2 leading-relaxed">{item.alurTujuanPembelajaran}</td>
                    <td className="border-2 border-black p-2 font-bold uppercase">{item.materi}</td>
                    <td className="border-2 border-black p-1 text-center font-black">{item.alokasiWaktu}</td>
                    <td className="border-2 border-black p-2 text-[7px] leading-tight">{item.dimensiProfilLulusan}</td>
                    <td className="border-2 border-black p-2 text-[7px] leading-tight">
                       <p><b>Awal:</b> {item.asesmenAwal}</p>
                       <p><b>Proses:</b> {item.asesmenProses}</p>
                       <p><b>Akhir:</b> {item.asesmenAkhir}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-16 flex justify-between items-start text-[10px] px-12 font-sans uppercase font-black tracking-tight break-inside-avoid">
             <div className="text-center w-72">
                <p>Mengetahui,</p> <p>Kepala Sekolah</p> <div className="h-24"></div> <p className="border-b border-black inline-block min-w-[200px]">{settings.principalName}</p> <p className="no-underline mt-1 font-normal">NIP. {settings.principalNip}</p>
             </div>
             <div className="text-center w-72">
                <p>Bilato, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p> <p>Guru Kelas/Mapel</p> <div className="h-24"></div> <p className="border-b border-black inline-block min-w-[200px]">{user?.name || '[Nama Guru]'}</p> <p className="no-underline mt-1 font-normal">NIP. {user?.nip || '...................'}</p>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {message && (
        <div className={`fixed top-24 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border transition-all animate-in slide-in-from-right ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
          message.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
          <span className="text-sm font-black uppercase tracking-tight">{message.text}</span>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Hapus ATP</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">Hapus baris ATP dari database cloud?</p>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 transition-all">BATAL</button>
              <button onClick={handleDelete} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg">YA, HAPUS</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
           <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><ListTree size={24} /></div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Alur Tujuan Pembelajaran (ATP)</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Status: {user.apiKey ? 'Personal Key' : 'System Key'}</p>
              </div>
           </div>
           <div className="flex flex-wrap gap-2">
             <button onClick={handleSyncFromAnalisis} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg">
                <Copy size={16}/> AMBIL DARI ANALISIS
             </button>
             <button onClick={() => setIsPrintMode(true)} className="bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-black transition-all shadow-lg">
                <Printer size={16}/> PRATINJAU
             </button>
             <button onClick={handleExportWord} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg">
                <FileDown size={16}/> WORD
             </button>
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-[24px] border border-slate-100">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Fase {isClassLocked && <Lock size={10} className="text-amber-500" />}</label>
            <select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none disabled:bg-slate-100 disabled:text-slate-400" value={filterFase} disabled={isClassLocked} onChange={(e) => setFilterFase(e.target.value as Fase)}>
              {Object.values(Fase).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Pilih Kelas</label>
            <select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none disabled:bg-slate-100 disabled:text-slate-400" value={filterKelas} disabled={isClassLocked} onChange={(e) => handleKelasChange(e.target.value as Kelas)}>
              {['1','2','3','4','5','6'].map(k => <option key={k} value={k}>Kelas {k}</option>)}
            </select>
          </div>
          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Mapel</label><select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none" value={filterMapel} onChange={(e) => setFilterMapel(e.target.value)}>{availableMapel.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-xl border border-slate-200 overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[2000px]">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-black h-12 uppercase tracking-widest">
                <th className="px-6 py-4 w-16 text-center">No</th>
                <th className="px-6 py-4 w-72">Elemen & CP</th>
                <th className="px-6 py-4 w-64">Tujuan Pembelajaran (TP)</th>
                <th className="px-6 py-4 w-80">Alur Tujuan (ATP)</th>
                <th className="px-6 py-4 w-48">Materi & AW</th>
                <th className="px-6 py-4 w-64">Profil Lulusan</th>
                <th className="px-6 py-4 w-80">Rencana Asesmen</th>
                <th className="px-6 py-4 w-32 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="py-20 text-center"><Loader2 className="animate-spin inline-block text-blue-600" /></td></tr>
              ) : filteredAtp.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-24 text-center text-slate-400 italic font-bold uppercase text-xs">Belum ada data. Klik tombol Ambil dari Analisis.</td></tr>
              ) : (
                filteredAtp.map((item, idx) => (
                  <tr key={item.id} className="align-top group hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-6 text-center font-black text-slate-300">{idx + 1}</td>
                    <td className="px-6 py-6 border-r border-slate-50">
                      <div className="font-black text-[10px] text-blue-600 uppercase mb-2">{item.elemen}</div>
                      <div className="text-[10px] text-slate-400 italic leading-relaxed">{item.capaianPembelajaran}</div>
                    </td>
                    <td className="px-6 py-6 border-r border-slate-50">
                      <textarea className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 leading-relaxed resize-none p-0 h-32" value={item.tujuanPembelajaran} onChange={e => updateField(item.id, 'tujuanPembelajaran', e.target.value)} />
                    </td>
                    <td className="px-6 py-6 border-r border-slate-50 bg-blue-50/10">
                      <textarea className="w-full bg-transparent border-none focus:ring-0 text-xs font-medium text-blue-900 leading-relaxed resize-none p-0 h-32" value={item.alurTujuanPembelajaran} onChange={e => updateField(item.id, 'alurTujuanPembelajaran', e.target.value)} placeholder="Tulis atau gunakan AI..." />
                    </td>
                    <td className="px-6 py-6 border-r border-slate-50">
                      <input className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-black uppercase mb-2" value={item.materi} onChange={e => updateField(item.id, 'materi', e.target.value)} placeholder="Materi" />
                      <div className="flex items-center gap-2">
                        <input className="w-20 bg-slate-900 text-white border-none rounded-lg p-2 text-center text-xs font-black" value={item.alokasiWaktu} onChange={e => updateField(item.id, 'alokasiWaktu', e.target.value)} placeholder="JP" />
                        <span className="text-[10px] font-black text-slate-400 uppercase">JP</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 border-r border-slate-50">
                       <textarea className="w-full bg-transparent border-none focus:ring-0 text-[10px] font-bold text-slate-600 leading-relaxed resize-none p-0 h-32" value={item.dimensiProfilLulusan} onChange={e => updateField(item.id, 'dimensiProfilLulusan', e.target.value)} />
                    </td>
                    <td className="px-6 py-6 border-r border-slate-50 space-y-2">
                       <div><label className="text-[8px] font-black text-slate-400 uppercase">Awal</label><input className="w-full bg-slate-50 border border-slate-100 p-2 rounded text-[10px]" value={item.asesmenAwal} onChange={e => updateField(item.id, 'asesmenAwal', e.target.value)} /></div>
                       <div><label className="text-[8px] font-black text-slate-400 uppercase">Proses</label><input className="w-full bg-slate-50 border border-slate-100 p-2 rounded text-[10px]" value={item.asesmenProses} onChange={e => updateField(item.id, 'asesmenProses', e.target.value)} /></div>
                       <div><label className="text-[8px] font-black text-slate-400 uppercase">Akhir</label><input className="w-full bg-slate-50 border border-slate-100 p-2 rounded text-[10px]" value={item.asesmenAkhir} onChange={e => updateField(item.id, 'asesmenAkhir', e.target.value)} /></div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleAIComplete(item.id)} disabled={isProcessingId === item.id} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 shadow-lg disabled:opacity-50">
                          {isProcessingId === item.id ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                        </button>
                        <button onClick={() => setDeleteConfirmId(item.id)} className="bg-red-50 text-red-600 p-3 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-start gap-3">
           <Info size={16} className="text-blue-600 shrink-0 mt-0.5"/>
           <p className="text-[10px] text-slate-400 font-medium italic leading-relaxed">
             *Gunakan tombol <b>Wand AI</b> untuk melengkapi Alur Tujuan, Dimensi Profil Lulusan, dan Rencana Asesmen secara otomatis berdasarkan Tujuan Pembelajaran yang ada. Dimensi profil kini dibatasi maksimal 3 pilihan saja.
           </p>
        </div>
      </div>
    </div>
  );
};

export default ATPManager;
