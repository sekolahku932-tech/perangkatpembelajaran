
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Fase, Kelas, ATPItem, AnalisisCP, CapaianPembelajaran, MATA_PELAJARAN, SchoolSettings, User, DIMENSI_PROFIL } from '../types';
import { Plus, Trash2, Sparkles, Loader2, Save, Eye, EyeOff, Search, CheckCircle2, X, AlertTriangle, RefreshCcw, Info, ClipboardCopy, Cloud, DownloadCloud, FileDown, Printer, Edit2, Wand2, Lock } from 'lucide-react';
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
  const [isImporting, setIsImporting] = useState(false);

  const [filterFase, setFilterFase] = useState<Fase>(Fase.A);
  const [filterKelas, setFilterKelas] = useState<Kelas>('1');
  const [filterMapel, setFilterMapel] = useState<string>(MATA_PELAJARAN[0]);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [analisisList, setAnalisisList] = useState<AnalisisCP[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  
  const [editModalItem, setEditModalItem] = useState<ATPItem | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: 'SD NEGERI 5 BILATO',
    address: 'Kecamatan Bilato, Kabupaten Gorontalo',
    principalName: 'Nama Kepala Sekolah',
    principalNip: '-'
  });

  const [activeYear, setActiveYear] = useState('2025/2026');

  const formatAlurTujuan = (tp: string): string => {
    if (!tp) return '';
    return `(Klik tombol "SUSUN ALUR (AI)" untuk menyusun langkah-langkah secara rapi...)`;
  };

  useEffect(() => {
    if (user.role === 'guru') {
      if (user.kelas !== '-' && user.kelas !== 'Multikelas') {
        setFilterKelas(user.kelas as Kelas);
      }
      if (user.mapelDiampu && user.mapelDiampu.length > 0) {
        if (!user.mapelDiampu.includes(filterMapel)) {
          setFilterMapel(user.mapelDiampu[0]);
        }
      }
      updateFaseByKelas(user.kelas as Kelas);
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

    const unsubscribeATP = onSnapshot(collection(db, "atp"), (snapshot) => {
      setAtpData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ATPItem[]);
      setLoading(false);
    });

    const unsubscribeCP = onSnapshot(collection(db, "cps"), (snapshot) => {
      setCps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CapaianPembelajaran[]);
    });

    const unsubscribeAnalisis = onSnapshot(collection(db, "analisis"), (snapshot) => {
      setAllAnalisis(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AnalisisCP[]);
    });

    return () => { unsubSettings(); unsubscribeATP(); unsubscribeCP(); unsubscribeAnalisis(); };
  }, []);

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
              body { font-family: 'Inter', sans-serif; background: white; padding: 20px; font-size: 9pt; }
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

  const handleExportWord = () => {
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>ATP</title><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 5px; font-family: 'Arial'; font-size: 9px; vertical-align: top; } .text-center { text-align: center; } .whitespace-pre-line { white-space: pre-line; }</style></head><body>`;
    const footer = "</body></html>";
    let tableHtml = `<div style="text-align:center"><h2 style="margin:0">ALUR TUJUAN PEMBELAJARAN (ATP)</h2><h3 style="margin:5px 0">${settings.schoolName}</h3><p style="font-size:10px">MAPEL: ${filterMapel} | KELAS: ${filterKelas} | FASE: ${filterFase}</p></div><br/><table><thead><tr style="background-color: #f3f4f6"><th style="width:30px">NO</th><th style="width:150px">ELEMEN & CP</th><th>TUJUAN PEMBELAJARAN (TP)</th><th>ALUR TUJUAN (ATP)</th><th style="width:100px">MATERI POKOK</th><th style="width:30px">JP</th><th style="width:100px">DPL</th><th style="width:120px">ASESMEN (A,P,K)</th></tr></thead><tbody>${filteredAtp.map((item, idx) => `<tr><td class="text-center">${idx + 1}</td><td><b>${item.elemen}</b><br/><i>${item.capaianPembelajaran}</i></td><td>${item.tujuanPembelajaran}</td><td class="whitespace-pre-line">${item.alurTujuanPembelajaran}</td><td><b>${item.materi}</b><br/><i>${item.subMateri}</i></td><td class="text-center">${item.alokasiWaktu}</td><td>${item.dimensiProfilLulusan}</td><td>A: ${item.asesmenAwal}<br/>P: ${item.asesmenProses}<br/>K: ${item.asesmenAkhir}</td></tr>`).join('')}</tbody></table>`;
    const blob = new Blob(['\ufeff', header + tableHtml + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ATP_${filterMapel}_Kls${filterKelas}.doc`;
    link.click();
  };

  const filteredAtp = useMemo(() => {
    const currentMapelNormalized = (filterMapel || '').trim().toLowerCase();
    
    const filtered = atpData.filter(item => 
      item.fase === filterFase && 
      item.kelas === filterKelas && 
      (item.mataPelajaran || '').trim().toLowerCase() === currentMapelNormalized
    );
    
    return filtered.sort((a, b) => {
      if ((a.indexOrder || 0) !== (b.indexOrder || 0)) {
        return (a.indexOrder || 0) - (b.indexOrder || 0);
      }

      const cpA = cps.find(c => c.elemen === a.elemen && c.mataPelajaran.trim().toLowerCase() === currentMapelNormalized && c.fase === filterFase);
      const cpB = cps.find(c => c.elemen === b.elemen && c.mataPelajaran.trim().toLowerCase() === currentMapelNormalized && c.fase === filterFase);
      const kodeA = cpA?.kode || 'ZZZ';
      const kodeB = cpB?.kode || 'ZZZ';
      
      return kodeA.localeCompare(kodeB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [atpData, cps, filterFase, filterKelas, filterMapel]);

  const availableMapel = user.role === 'admin' ? MATA_PELAJARAN : user.mapelDiampu;

  const availableElements = useMemo(() => {
    const currentMapelNormalized = (filterMapel || '').trim().toLowerCase();
    const relevantCps = cps.filter(c => c.fase === filterFase && c.mataPelajaran.trim().toLowerCase() === currentMapelNormalized);
    return Array.from(new Set(relevantCps.map(c => c.elemen)));
  }, [cps, filterFase, filterMapel]);

  const handleAddRow = async () => {
    const currentMaxOrder = filteredAtp.length > 0 ? Math.max(...filteredAtp.map(a => a.indexOrder || 0)) : 0;
    
    try {
      await addDoc(collection(db, "atp"), {
        fase: filterFase, kelas: filterKelas, mataPelajaran: filterMapel,
        elemen: '', capaianPembelajaran: '', materi: '', subMateri: '',
        tujuanPembelajaran: '', alurTujuanPembelajaran: '', alokasiWaktu: '',
        dimensiProfilLulusan: '', asesmenAwal: '', asesmenProses: '', asesmenAkhir: '', sumberBelajar: '',
        indexOrder: currentMaxOrder + 1
      });
    } catch (e) { console.error(e); }
  };

  const executeImportAll = async (relevantAnalisis: AnalisisCP[]) => {
    setIsImporting(true);
    let importedCount = 0;
    try {
      const sortedAnalisis = [...relevantAnalisis].sort((a, b) => (a.indexOrder || 0) - (b.indexOrder || 0));
      
      for (const item of sortedAnalisis) {
        const isDuplicate = atpData.some(atp => 
          atp.mataPelajaran.trim().toLowerCase() === filterMapel.trim().toLowerCase() &&
          atp.tujuanPembelajaran.trim().toLowerCase() === item.tujuanPembelajaran.trim().toLowerCase() &&
          atp.kelas === filterKelas
        );
        
        if (!isDuplicate) {
          const parentCp = cps.find(c => c.id === item.cpId);
          
          await addDoc(collection(db, "atp"), {
            fase: filterFase,
            kelas: filterKelas,
            mataPelajaran: filterMapel,
            elemen: parentCp?.elemen || '',
            capaianPembelajaran: parentCp?.deskripsi || '',
            materi: item.materi,
            subMateri: item.subMateri,
            tujuanPembelajaran: item.tujuanPembelajaran,
            alurTujuanPembelajaran: formatAlurTujuan(item.tujuanPembelajaran),
            alokasiWaktu: '', dimensiProfilLulusan: '', asesmenAwal: '', asesmenProses: '', asesmenAkhir: '', sumberBelajar: '',
            indexOrder: item.indexOrder || 0 
          });
          importedCount++;
        }
      }
      setMessage({ text: `Berhasil menyinkronkan ${importedCount} data Alur.`, type: 'success' });
    } catch (e) {
      setMessage({ text: 'Gagal mengimpor data.', type: 'error' });
    } finally {
      setIsImporting(false);
      setConfirmDialog(null);
    }
  };

  const handleImportAllFromAnalisis = () => {
    const currentMapelNormalized = filterMapel.trim().toLowerCase();
    
    const relevantAnalisis = allAnalisis.filter(a => {
      if (a.fase !== filterFase || a.kelas !== filterKelas) return false;
      const parentCp = cps.find(c => c.id === a.cpId);
      if (!parentCp) return false;
      return parentCp.mataPelajaran.trim().toLowerCase() === currentMapelNormalized;
    });

    if (relevantAnalisis.length === 0) {
      setMessage({ text: `Data analisis belum tersedia untuk ${filterMapel} di Kelas ${filterKelas}.`, type: 'warning' });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Sinkronisasi Alur',
      message: `Impor ${relevantAnalisis.length} TP dari Analisis? Sistem akan menata urutan secara linear sesuai dengan urutan CP ${filterMapel}.`,
      onConfirm: () => executeImportAll(relevantAnalisis)
    });
  };

  const updateField = async (id: string, field: keyof ATPItem, value: any) => {
    try {
      const updateData: any = { [field]: value };
      if (field === 'tujuanPembelajaran') updateData.alurTujuanPembelajaran = formatAlurTujuan(value);
      if (field === 'elemen') {
        const foundCp = cps.find(c => c.elemen === value && c.fase === filterFase && c.mataPelajaran.trim().toLowerCase() === filterMapel.trim().toLowerCase());
        if (foundCp) updateData.capaianPembelajaran = foundCp.deskripsi;
      }
      await updateDoc(doc(db, "atp", id), updateData);
    } catch (e) { console.error(e); }
  };

  const deleteRow = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus ATP',
      message: 'Hapus baris ini dari alur tujuan pembelajaran cloud?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "atp", id));
          setMessage({ text: 'Data ATP berhasil dihapus', type: 'success' });
        } catch (e) {
          setMessage({ text: 'Gagal menghapus data', type: 'error' });
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleAIComplete = async (id: string) => {
    const item = atpData.find(i => i.id === id);
    if (!item || !item.tujuanPembelajaran) return;
    setIsProcessingId(id);
    try {
      const suggestions = await completeATPDetails(item.tujuanPembelajaran, item.materi, item.kelas);
      if (suggestions) {
        await updateDoc(doc(db, "atp", id), {
          alurTujuanPembelajaran: suggestions.alurTujuan,
          alokasiWaktu: item.alokasiWaktu || suggestions.alokasiWaktu,
          dimensiProfilLulusan: item.dimensiProfilLulusan || suggestions.dimensiOfProfil,
          asesmenAwal: item.asesmenAwal || suggestions.asesmenAwal,
          asesmenProses: item.asesmenProses || suggestions.asesmenProses,
          asesmenAkhir: item.asesmenAkhir || suggestions.asesmenAkhir,
          sumberBelajar: item.sumberBelajar || suggestions.sumberBelajar
        });
        setMessage({ text: 'Detail ATP dilengkapi AI', type: 'success' });
      }
    } catch (err) {
      setMessage({ text: 'Gagal menghubungi AI', type: 'error' });
    } finally { setIsProcessingId(null); }
  };

  const loadAnalisis = () => {
    const currentMapelNormalized = filterMapel.trim().toLowerCase();
    const filtered = allAnalisis.filter(a => {
      if (a.fase !== filterFase || a.kelas !== filterKelas) return false;
      const parentCp = cps.find(c => c.id === a.cpId);
      return parentCp && parentCp.mataPelajaran.trim().toLowerCase() === currentMapelNormalized;
    });
    setAnalisisList([...filtered].sort((a, b) => (a.indexOrder || 0) - (b.indexOrder || 0)));
  };

  const openPicker = (rowId: string | null) => {
    loadAnalisis();
    setActiveRowId(rowId);
    setIsPickerOpen(true);
  };

  const selectFromAnalisis = async (item: AnalisisCP) => {
    const parentCp = cps.find(c => c.id === item.cpId);
    try {
      const atpPayload = {
        elemen: parentCp?.elemen || '',
        capaianPembelajaran: parentCp?.deskripsi || '',
        materi: item.materi,
        subMateri: item.subMateri,
        tujuanPembelajaran: item.tujuanPembelajaran,
        alurTujuanPembelajaran: formatAlurTujuan(item.tujuanPembelajaran),
        mataPelajaran: filterMapel,
        indexOrder: item.indexOrder || 0 
      };

      if (activeRowId) {
        await updateDoc(doc(db, "atp", activeRowId), atpPayload);
      } else {
        await addDoc(collection(db, "atp"), { 
          ...atpPayload, 
          fase: filterFase, 
          kelas: filterKelas, 
          alokasiWaktu: '', 
          dimensiProfilLulusan: '', 
          asesmenAwal: '', 
          asesmenProses: '', 
          asesmenAkhir: '', 
          sumberBelajar: '' 
        });
      }
      setMessage({ text: 'Data alur disinkronkan', type: 'success' });
    } catch (e) { console.error(e); }
    setIsPickerOpen(false);
  };

  const isClassLocked = user.role === 'guru' && user.teacherType === 'kelas';

  // UI Pratinjau Cetak ATP
  if (isPrintMode) {
    return (
      <div className="bg-white p-8 lg:p-12 min-h-screen text-slate-900 font-serif">
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
            <h1 className="text-xl font-black uppercase border-b-4 border-black pb-2 inline-block">Alur Tujuan Pembelajaran (ATP)</h1>
            <h2 className="text-lg font-bold mt-3 uppercase">{settings.schoolName}</h2>
            <div className="flex justify-center gap-10 mt-6 text-[9px] font-black uppercase font-sans text-slate-500 tracking-widest">
              <span>MAPEL: {filterMapel}</span> <span>KELAS: {filterKelas}</span> <span>FASE: {filterFase}</span>
            </div>
          </div>

          <table className="w-full border-collapse border-2 border-black text-[9px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-2 border-black px-2 py-3 w-8 text-center">NO</th>
                <th className="border-2 border-black px-3 py-3 w-40 text-left">ELEMEN & CP</th>
                <th className="border-2 border-black px-3 py-3 text-left">TUJUAN PEMBELAJARAN (TP)</th>
                <th className="border-2 border-black px-3 py-3 w-64 text-left">ALUR TUJUAN (ATP)</th>
                <th className="border-2 border-black px-3 py-3 w-32 text-left">MATERI POKOK</th>
                <th className="border-2 border-black px-2 py-3 w-10 text-center">JP</th>
                <th className="border-2 border-black px-2 py-3 w-32 text-left">PROFIL LULUSAN</th>
                <th className="border-2 border-black px-2 py-3 w-40 text-left">ASESMEN</th>
              </tr>
            </thead>
            <tbody>
              {filteredAtp.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center italic border-2 border-black">Data ATP tidak tersedia untuk filter yang dipilih.</td></tr>
              ) : (
                filteredAtp.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="border-2 border-black px-1 py-3 text-center font-bold">{idx + 1}</td>
                    <td className="border-2 border-black px-2 py-3">
                      <div className="font-black mb-1 uppercase leading-tight">{item.elemen}</div>
                      <div className="italic text-[8px] leading-tight text-slate-600">{item.capaianPembelajaran}</div>
                    </td>
                    <td className="border-2 border-black px-2 py-3 font-bold">{item.tujuanPembelajaran}</td>
                    <td className="border-2 border-black px-2 py-3 whitespace-pre-line leading-relaxed italic">{item.alurTujuanPembelajaran}</td>
                    <td className="border-2 border-black px-2 py-3">
                       <div className="font-black">{item.materi}</div>
                       <div className="italic text-[8px]">{item.subMateri}</div>
                    </td>
                    <td className="border-2 border-black px-1 py-3 text-center font-black">{item.alokasiWaktu}</td>
                    <td className="border-2 border-black px-2 py-3 text-[8px]">{item.dimensiProfilLulusan}</td>
                    <td className="border-2 border-black px-2 py-3 text-[8px] leading-tight">
                       <div><b>Awal:</b> {item.asesmenAwal}</div>
                       <div className="mt-1"><b>Proses:</b> {item.asesmenProses}</div>
                       <div className="mt-1"><b>Akhir:</b> {item.asesmenAkhir}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-16 flex justify-between items-start text-[10px] px-12 font-sans uppercase font-black tracking-tighter">
            <div className="text-center w-72">
              <p>Mengetahui,</p> 
              <p>Kepala Sekolah</p> 
              <div className="h-24"></div> 
              <p className="border-b border-black inline-block min-w-[200px]">{settings.principalName}</p> 
              <p className="no-underline mt-1 font-normal">NIP. {settings.principalNip}</p>
            </div>
            <div className="text-center w-72">
              <p>Bilato, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p> 
              <p>Guru Kelas/Mapel</p> 
              <div className="h-24"></div> 
              <p className="border-b border-black inline-block min-w-[200px]">{user?.name || '[Nama Guru]'}</p> 
              <p className="no-underline mt-1 font-normal">NIP. {user?.nip || '...................'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {message && (<div className={`fixed top-24 right-8 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}><CheckCircle2 size={20}/><span className="text-sm font-black uppercase">{message.text}</span></div>)}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center"><div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><AlertTriangle size={32} /></div><h3 className="text-xl font-black text-slate-900 uppercase mb-2">{confirmDialog.title}</h3><p className="text-slate-500 font-medium text-sm">{confirmDialog.message}</p></div>
            <div className="p-6 bg-slate-50 flex gap-3"><button onClick={() => setConfirmDialog(null)} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-slate-500 bg-white border border-slate-200">BATAL</button><button onClick={confirmDialog.onConfirm} disabled={isImporting} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2">{isImporting ? <Loader2 size={14} className="animate-spin"/> : 'LANJUT'}</button></div>
          </div>
        </div>
      )}

      {/* Modal Editor ATP */}
      {editModalItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 no-print">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-4"><div className="p-3 bg-blue-500 rounded-2xl shadow-lg"><Edit2 size={24}/></div><div><h3 className="font-black uppercase text-lg tracking-widest leading-none">Editor Detail ATP</h3><p className="text-[10px] text-slate-400 font-bold mt-1 tracking-tighter">SINKRONISASI CLOUD AKTIF</p></div></div>
              <button onClick={() => setEditModalItem(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase mb-4 tracking-widest">TUJUAN & ALUR</h4>
                    <div className="space-y-4">
                      <div><label className="text-[9px] font-black text-slate-400 uppercase mb-1.5 block">Tujuan Pembelajaran</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold min-h-[100px]" value={editModalItem.tujuanPembelajaran} onChange={e => updateField(editModalItem.id, 'tujuanPembelajaran', e.target.value)}/></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase mb-1.5 block">Alur Tujuan (ATP)</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium italic min-h-[200px] whitespace-pre-line" value={editModalItem.alurTujuanPembelajaran} onChange={e => updateField(editModalItem.id, 'alurTujuanPembelajaran', e.target.value)}/></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                   <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-rose-600 uppercase mb-4 tracking-widest">ASESMEN</h4>
                    <div className="space-y-4">
                      <div><label className="text-[9px] font-black text-slate-400 uppercase mb-1.5 block">Awal</label><textarea className="w-full bg-rose-50/30 border border-rose-100 rounded-2xl p-4 text-[11px]" value={editModalItem.asesmenAwal} onChange={e => updateField(editModalItem.id, 'asesmenAwal', e.target.value)}/></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase mb-1.5 block">Proses</label><textarea className="w-full bg-blue-50/30 border border-blue-100 rounded-2xl p-4 text-[11px]" value={editModalItem.asesmenProses} onChange={e => updateField(editModalItem.id, 'asesmenProses', e.target.value)}/></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase mb-1.5 block">Sumatif</label><textarea className="w-full bg-emerald-50/30 border border-emerald-100 rounded-2xl p-4 text-[11px]" value={editModalItem.asesmenAkhir} onChange={e => updateField(editModalItem.id, 'asesmenAkhir', e.target.value)}/></div>
                    </div>
                  </div>
                  <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-amber-600 uppercase mb-4 tracking-widest">PROFIL LULUSAN (DPL)</h4>
                    <textarea className="w-full bg-amber-50/30 border border-amber-100 rounded-2xl p-4 text-[11px] font-bold text-amber-900" placeholder="Contoh: Kolaborasi, Kreativitas..." value={editModalItem.dimensiProfilLulusan} onChange={e => updateField(editModalItem.id, 'dimensiProfilLulusan', e.target.value)}/>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-white border-t flex justify-end gap-3"><button onClick={() => handleAIComplete(editModalItem.id)} disabled={isProcessingId === editModalItem.id} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[11px] font-black flex items-center gap-2 shadow-xl shadow-indigo-100 disabled:opacity-50">{isProcessingId === editModalItem.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16}/>} OPTIMALKAN AI</button><button onClick={() => setEditModalItem(null)} className="bg-slate-900 text-white px-12 py-3 rounded-2xl text-[11px] font-black shadow-lg">SELESAI</button></div>
          </div>
        </div>
      )}

      {isPickerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 no-print">
          <div className="bg-white w-full max-w-4xl max-h-[80vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center"><div className="flex items-center gap-4"><div className="p-3 bg-emerald-500 rounded-2xl"><Search size={24}/></div><div><h3 className="font-black uppercase text-lg tracking-widest leading-none">Pilih dari Analisis</h3><p className="text-xs text-slate-400 font-bold mt-1">SINKRONISASI URUTAN MAPEL: {filterMapel}</p></div></div><button onClick={() => setIsPickerOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-100">
              {analisisList.length === 0 ? (<div className="text-center py-20 text-slate-400 italic font-bold">Tidak ada data analisis untuk {filterMapel} di Kelas {filterKelas}.</div>) : (
                analisisList.map((item) => (<button key={item.id} onClick={() => selectFromAnalisis(item)} className="w-full text-left p-6 bg-white border border-slate-200 rounded-[24px] hover:border-emerald-500 transition-all group"><div className="flex justify-between items-start gap-6"><div className="flex-1"><div className="flex flex-wrap gap-2 mb-3"><span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase">Materi: {item.materi}</span></div><div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100"><p className="text-sm text-slate-800 font-bold">{item.tujuanPembelajaran}</p></div></div><CheckCircle2 className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" size={24}/></div></button>))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex flex-wrap gap-3">
            <button onClick={handleAddRow} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100"><Plus size={18} /> BARIS BARU</button>
            <button onClick={handleImportAllFromAnalisis} disabled={isImporting} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-100 disabled:opacity-50"><DownloadCloud size={18} /> SINKRON ANALISIS ({filterMapel})</button>
            <button onClick={() => openPicker(null)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-emerald-700 shadow-xl shadow-emerald-100"><ClipboardCopy size={18} /> PILIH MANUAL</button>
          </div>
          <button onClick={() => setIsPrintMode(true)} className="flex-1 md:flex-none bg-slate-800 text-white px-6 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:bg-black shadow-lg"><Eye size={18} /> MODE CETAK</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-[24px] border border-slate-100">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-1">
              Fase {isClassLocked && <Lock size={10} className="text-amber-500" />}
            </label>
            <select 
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none disabled:bg-slate-100 disabled:text-slate-400" 
              value={filterFase} 
              disabled={isClassLocked}
              onChange={(e) => setFilterFase(e.target.value as Fase)}
            >
              {Object.values(Fase).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-1">
              Pilih Kelas {isClassLocked && <Lock size={10} className="text-amber-500" />}
            </label>
            <select 
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none disabled:bg-slate-100 disabled:text-slate-400" 
              value={filterKelas} 
              disabled={isClassLocked}
              onChange={(e) => handleKelasChange(e.target.value as Kelas)}
            >
              {['1','2','3','4','5','6'].map(k => <option key={k} value={k}>Kelas {k}</option>)}
            </select>
          </div>
          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Mapel</label><select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none" value={filterMapel} onChange={(e) => setFilterMapel(e.target.value)}>{availableMapel.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
        </div>
      </div>
      <div className="bg-white rounded-[40px] shadow-xl border border-slate-200 overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[2000px]">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-black h-16 uppercase tracking-[0.15em]">
                <th className="px-6 py-4 w-48 border-r border-white/5">Elemen (Pilih)</th>
                <th className="px-6 py-4 w-64 border-r border-white/5">CP (Auto-fill)</th>
                <th className="px-6 py-4 w-96 border-r border-white/5">Tujuan Pembelajaran (TP)</th>
                <th className="px-6 py-4 w-96 border-r border-white/5">Alur Tujuan (ATP)</th>
                <th className="px-6 py-4 w-56 border-r border-white/5">Materi & JP</th>
                <th className="px-6 py-4 w-64 border-r border-white/5">Dimensi Profil Lulusan (DPL)</th>
                <th className="px-6 py-4 w-80 text-center border-r border-white/5">Asesmen (A, P, K)</th>
                <th className="px-6 py-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (<tr><td colSpan={8} className="px-6 py-28 text-center"><Loader2 size={32} className="animate-spin inline mr-2 text-blue-500"/> Sinkronisasi...</td></tr>) : filteredAtp.length === 0 ? (<tr><td colSpan={8} className="px-6 py-28 text-center text-slate-400 italic font-bold uppercase tracking-widest">Data Kosong. Gunakan tombol Sinkron Analisis untuk menarik data TP secara urut linear.</td></tr>) : (
                filteredAtp.map((item) => (
                  <tr key={item.id} className="align-top group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-6 border-r border-slate-100"><select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] font-black" value={item.elemen} onChange={e => updateField(item.id, 'elemen', e.target.value)}><option value="">- Pilih Elemen -</option>{availableElements.map(el => <option key={el} value={el}>{el}</option>)}</select></td>
                    <td className="px-6 py-6 border-r border-slate-100"><textarea className="w-full bg-transparent border-none focus:ring-0 text-[10px] text-slate-500 italic leading-relaxed resize-none p-0 h-32" value={item.capaianPembelajaran} readOnly /></td>
                    <td className="px-6 py-6 border-r border-slate-100 relative group/tp"><textarea className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 leading-relaxed resize-none p-0 h-32" value={item.tujuanPembelajaran} onChange={e => updateField(item.id, 'tujuanPembelajaran', e.target.value)} /><button onClick={() => openPicker(item.id)} className="absolute bottom-4 right-4 bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1 shadow-lg hover:bg-emerald-700 transition-all"><Search size={12}/> Ambil Analisis</button></td>
                    <td className="px-6 py-6 border-r border-slate-100 bg-blue-50/10 relative group/atp"><textarea className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-blue-900 leading-loose resize-none p-0 h-64 whitespace-pre-line" value={item.alurTujuanPembelajaran} onChange={e => updateField(item.id, 'alurTujuanPembelajaran', e.target.value)} /><button onClick={() => handleAIComplete(item.id)} disabled={isProcessingId === item.id} className="absolute bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-xl hover:bg-indigo-700 active:scale-95 disabled:opacity-50">{isProcessingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} SUSUN ALUR AI</button></td>
                    <td className="px-6 py-6 border-r border-slate-100"><div className="space-y-4"><input className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-black uppercase" value={item.materi} placeholder="Materi" onChange={e => updateField(item.id, 'materi', e.target.value)} /><input className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs font-black text-center" value={item.alokasiWaktu} placeholder="JP" onChange={e => updateField(item.id, 'alokasiWaktu', e.target.value)} /></div></td>
                    <td className="px-6 py-6 border-r border-slate-100"><textarea className="w-full bg-transparent border-none focus:ring-0 text-[10px] font-bold text-emerald-800 leading-relaxed resize-none p-0 h-32" placeholder="Dimensi Profil Lulusan..." value={item.dimensiProfilLulusan} onChange={e => updateField(item.id, 'dimensiProfilLulusan', e.target.value)} /></td>
                    <td className="px-6 py-6 border-r border-slate-100 p-0"><div className="flex flex-col divide-y divide-slate-100 h-full"><div className="p-3 bg-rose-50/20"><textarea className="w-full border-none bg-transparent focus:ring-0 text-[10px] font-medium resize-none p-0 min-h-[30px]" value={item.asesmenAwal} placeholder="Awal" onChange={e => updateField(item.id, 'asesmenAwal', e.target.value)} /></div><div className="p-3 bg-indigo-50/20"><textarea className="w-full border-none bg-transparent focus:ring-0 text-[10px] font-medium resize-none p-0 min-h-[30px]" value={item.asesmenProses} placeholder="Formatif" onChange={e => updateField(item.id, 'asesmenProses', e.target.value)} /></div><div className="p-3 bg-emerald-50/20"><textarea className="w-full border-none bg-transparent focus:ring-0 text-[10px] font-medium resize-none p-0 min-h-[30px]" value={item.asesmenAkhir} placeholder="Sumatif" onChange={e => updateField(item.id, 'asesmenAkhir', e.target.value)} /></div></div></td>
                    <td className="px-4 py-6"><div className="flex flex-col gap-3 items-center justify-center h-full opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditModalItem(item)} className="p-3 bg-blue-100 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-md"><Edit2 size={18} /></button><button onClick={() => deleteRow(item.id)} className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-md"><Trash2 size={18} /></button></div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ATPManager;
