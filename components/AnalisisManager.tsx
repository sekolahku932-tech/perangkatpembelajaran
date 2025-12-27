
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Fase, Kelas, CapaianPembelajaran, AnalisisCP, MATA_PELAJARAN, SchoolSettings, User } from '../types';
import { Plus, Trash2, Sparkles, Loader2, Eye, EyeOff, BrainCircuit, Cloud, AlertTriangle, X, FileDown, Printer, Lock, AlertCircle } from 'lucide-react';
import { analyzeCPToTP } from '../services/geminiService';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from '../services/firebase';

interface AnalisisManagerProps {
  user: User;
}

const AnalisisManager: React.FC<AnalisisManagerProps> = ({ user }) => {
  const [cps, setCps] = useState<CapaianPembelajaran[]>([]);
  const [analisis, setAnalisis] = useState<AnalisisCP[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterFase, setFilterFase] = useState<Fase>(Fase.A);
  const [filterKelas, setFilterKelas] = useState<Kelas>('1');
  const [filterMapel, setFilterMapel] = useState<string>(MATA_PELAJARAN[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  
  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: 'SD NEGERI 5 BILATO',
    address: 'Kecamatan Bilato, Kabupaten Gorontalo',
    principalName: 'Nama Kepala Sekolah',
    principalNip: '-'
  });

  const printRef = useRef<HTMLDivElement>(null);

  const isClassLocked = user.role === 'guru' && (user.teacherType === 'kelas' || (!user.teacherType && user.kelas !== '-' && user.kelas !== 'Multikelas'));

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

    const unsubCp = onSnapshot(collection(db, "cps"), snap => {
      setCps(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CapaianPembelajaran[]);
    });

    const unsubAnalisis = onSnapshot(collection(db, "analisis"), snap => {
      setAnalisis(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AnalisisCP[]);
      setLoading(false);
    });
    return () => { unsubSettings(); unsubCp(); unsubAnalisis(); };
  }, []);

  const filteredAnalisis = useMemo(() => {
    const currentMapelNormalized = (filterMapel || '').trim().toLowerCase();
    return analisis
      .filter(a => a.fase === filterFase && a.kelas === filterKelas && a.mataPelajaran.trim().toLowerCase() === currentMapelNormalized)
      .sort((a, b) => (a.indexOrder || 0) - (b.indexOrder || 0));
  }, [analisis, filterFase, filterKelas, filterMapel]);

  const filteredCps = useMemo(() => {
    const currentMapelNormalized = (filterMapel || '').trim().toLowerCase();
    return cps
      .filter(cp => cp.fase === filterFase && cp.mataPelajaran.trim().toLowerCase() === currentMapelNormalized)
      .sort((a, b) => (a.kode || '').localeCompare(b.kode || '', undefined, { numeric: true, sensitivity: 'base' }));
  }, [cps, filterFase, filterMapel]);

  const handleAnalyze = async (cp: CapaianPembelajaran) => {
    setIsAnalyzing(true);
    try {
      const results = await analyzeCPToTP(cp.deskripsi, cp.elemen, cp.fase, filterKelas);
      if (results && Array.isArray(results)) {
        let lastOrder = filteredAnalisis.length > 0 
          ? Math.max(...filteredAnalisis.map(a => a.indexOrder || 0)) 
          : 0;

        for (const res of results) {
          lastOrder++;
          await addDoc(collection(db, "analisis"), {
            cpId: cp.id,
            fase: filterFase,
            kelas: filterKelas,
            mataPelajaran: filterMapel,
            materi: res.materi,
            subMateri: res.subMateri || '',
            tujuanPembelajaran: res.tp,
            indexOrder: lastOrder
          });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportWord = () => {
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export Word</title><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 8px; font-family: 'Arial'; font-size: 10px; vertical-align: top; } .text-center { text-align: center; } .font-bold { font-weight: bold; }</style></head><body>`;
    const footer = "</body></html>";
    
    let tableHtml = `
      <div style="text-align:center">
        <h2 style="margin:0">ANALISIS CAPAIAN PEMBELAJARAN (LINEAR)</h2>
        <h3 style="margin:5px 0">${settings.schoolName}</h3>
        <p style="font-size:10px">MAPEL: ${filterMapel} | KELAS: ${filterKelas}</p>
      </div>
      <br/>
      <table>
        <thead>
          <tr style="background-color: #f3f4f6">
            <th style="width:30px">NO</th>
            <th>CAPAIAN PEMBELAJARAN (CP)</th>
            <th>URUTAN MATERI</th>
            <th>TUJUAN PEMBELAJARAN (TP)</th>
          </tr>
        </thead>
        <tbody>
          ${filteredAnalisis.map((item, idx) => {
            const parentCp = cps.find(c => c.id === item.cpId);
            const isFirst = idx === 0 || filteredAnalisis[idx-1].cpId !== item.cpId;
            return `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td style="font-size: 8px; font-style: italic">${isFirst ? (parentCp?.deskripsi || '-') : ''}</td>
                <td class="font-bold">${item.materi}</td>
                <td>${item.tujuanPembelajaran}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    const blob = new Blob(['\ufeff', header + tableHtml + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ANALISIS_CP_LINEAR_${filterMapel}_Kls${filterKelas}.doc`;
    link.click();
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Analisis CP-TP - SDN 5 Bilato</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Inter', sans-serif; background: white; padding: 40px; }
              @media print { 
                .no-print { display: none !important; }
                body { padding: 0; }
              }
              table { border-collapse: collapse; }
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

  const availableMapel = user.role === 'admin' ? MATA_PELAJARAN : user.mapelDiampu;

  if (isPrintMode) {
    return (
      <div className="bg-white p-12 min-h-screen text-slate-900 font-serif">
        <div className="no-print mb-8 space-y-4">
          <div className="flex justify-between bg-slate-100 p-4 rounded-xl border border-slate-200 font-sans">
            <div className="flex gap-2">
              <button onClick={() => setIsPrintMode(false)} className="bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-black">KEMBALI</button>
              <button onClick={handleExportWord} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all">
                <FileDown size={14} /> UNDUH WORD
              </button>
            </div>
            <button onClick={handlePrint} className="bg-rose-600 text-white px-5 py-2 rounded-xl text-xs font-black">CETAK PDF</button>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-[11px] font-bold text-amber-800 font-sans">
            <AlertCircle size={18} className="shrink-0" />
            <p>Jika dialog cetak tidak muncul otomatis, harap pastikan pop-up browser tidak terblokir atau tekan tombol <span className="bg-amber-200 px-2 py-0.5 rounded">Ctrl + P</span>.</p>
          </div>
        </div>
        <div ref={printRef}>
          <div className="text-center mb-10">
            <h1 className="text-2xl font-black uppercase border-b-4 border-black pb-2 inline-block">ANALISIS CAPAIAN PEMBELAJARAN</h1>
            <h2 className="text-xl font-bold mt-3 uppercase">{settings.schoolName}</h2>
            <div className="flex justify-center gap-10 mt-6 text-xs font-black uppercase tracking-widest text-slate-600 font-sans">
              <span>KELAS: {filterKelas}</span> <span>MAPEL: {filterMapel}</span>
            </div>
          </div>
          <table className="w-full border-collapse border-2 border-black text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border-2 border-black px-3 py-2 w-10 text-center uppercase">NO</th>
                <th className="border-2 border-black px-3 py-2 text-left uppercase w-72">CAPAIAN PEMBELAJARAN (CP)</th>
                <th className="border-2 border-black px-3 py-2 text-left uppercase w-56">URUTAN MATERI</th>
                <th className="border-2 border-black px-3 py-2 text-left uppercase">TUJUAN PEMBELAJARAN</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnalisis.map((item, idx) => {
                const parentCp = cps.find(c => c.id === item.cpId);
                const isFirst = idx === 0 || filteredAnalisis[idx-1].cpId !== item.cpId;
                return (
                  <tr key={item.id}>
                    <td className="border-2 border-black px-3 py-3 text-center font-bold">{idx + 1}</td>
                    <td className="border-2 border-black px-3 py-3 italic text-[9px] leading-relaxed text-justify">
                      {isFirst ? (parentCp?.deskripsi || '-') : ''}
                    </td>
                    <td className="border-2 border-black px-3 py-3 font-bold uppercase">{item.materi}</td>
                    <td className="border-2 border-black px-3 py-3 leading-relaxed">{item.tujuanPembelajaran}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-16 flex justify-between items-start text-[10px] px-12 font-sans uppercase font-black tracking-tight">
             <div className="text-center w-72">
                <p>Mengetahui,</p> <p>Kepala Sekolah</p> <div className="h-24"></div> <p className="border-b border-black inline-block min-w-[200px]">{settings.principalName}</p> <p className="no-underline mt-1 font-normal">NIP. {settings.principalNip}</p>
             </div>
             <div className="text-center w-72">
                <p>Bilato, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p> <p>Guru Mata Pelajaran</p> <div className="h-24"></div> <p className="border-b border-black inline-block min-w-[200px]">{user?.name || '[Nama Guru]'}</p> <p className="no-underline mt-1 font-normal">NIP. {user?.nip || '...................'}</p>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg"><BrainCircuit size={24} /></div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">ANALISIS CAPAIAN PEMBELAJARAN</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Pemisah Kalimat Linear (Urutan Asli Teks)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsPrintMode(true)} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2"><Eye size={18} /> PRATINJAU</button>
            <button onClick={handleExportWord} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2"><FileDown size={18} /> WORD</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-[24px] border border-slate-100">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 flex items-center gap-1">Fase {isClassLocked && <Lock size={10} className="text-amber-500" />}</label>
            <select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none disabled:bg-slate-100" value={filterFase} disabled={isClassLocked} onChange={(e) => setFilterFase(e.target.value as Fase)}>
              {Object.values(Fase).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 flex items-center gap-1">Pilih Kelas {isClassLocked && <Lock size={10} className="text-amber-500" />}</label>
            <select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none disabled:bg-slate-100" value={filterKelas} disabled={isClassLocked} onChange={(e) => handleKelasChange(e.target.value as Kelas)}>
              {['1','2','3','4','5','6'].map(k => <option key={k} value={k}>Kelas {k}</option>)}
            </select>
          </div>
          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Mapel</label><select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none" value={filterMapel} onChange={(e) => setFilterMapel(e.target.value)}>{availableMapel.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1 bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center"><h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Daftar CP (Input)</h3><span className="text-[9px] font-black bg-white px-2 py-1 rounded border border-slate-200">LANGKAH 1</span></div>
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px] custom-scrollbar">
            {filteredCps.map(cp => (
              <div key={cp.id} className="p-6 hover:bg-slate-50 transition-colors group">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black">{cp.kode}</span>
                  <button onClick={() => handleAnalyze(cp)} disabled={isAnalyzing} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-100">
                    {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} ANALISIS LINEAR
                  </button>
                </div>
                <h4 className="font-black text-slate-800 text-sm uppercase mb-2">{cp.elemen}</h4>
                <p className="text-xs text-slate-500 leading-relaxed italic line-clamp-3">{cp.deskripsi}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center"><h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Pecahan TP Linear (Output)</h3><Cloud size={16} className="text-emerald-500" /></div>
          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest h-12">
                  <th className="px-6 py-2 w-16 text-center border-r border-white/5">No</th>
                  <th className="px-6 py-2 w-64 border-r border-white/5">Capaian Pembelajaran (CP)</th>
                  <th className="px-6 py-2 w-48 border-r border-white/5">Urutan Materi</th>
                  <th className="px-6 py-2">Tujuan Pembelajaran (TP)</th>
                  <th className="px-6 py-2 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAnalisis.map((item, idx) => {
                  const parentCp = cps.find(c => c.id === item.cpId);
                  const isFirst = idx === 0 || filteredAnalisis[idx-1].cpId !== item.cpId;
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors align-top">
                      <td className="px-6 py-6 text-center font-black text-slate-300 border-r border-slate-50">{idx + 1}</td>
                      <td className={`px-6 py-6 border-r border-slate-50 ${!isFirst ? 'opacity-20 bg-slate-50/10' : ''}`}>
                         {isFirst ? (
                           <div className="text-[10px] text-slate-500 italic leading-tight text-justify line-clamp-4">{parentCp?.deskripsi || '-'}</div>
                         ) : (
                           <div className="text-[8px] text-slate-300 italic text-center">— (Sama dengan CP di atas) —</div>
                         )}
                      </td>
                      <td className="px-6 py-6 border-r border-slate-50">
                        <div className="font-black text-slate-800 text-[11px] uppercase leading-tight tracking-tight">{item.materi}</div>
                      </td>
                      <td className="px-6 py-6 border-r border-slate-50">
                        <div className="text-[11px] font-medium text-slate-600 leading-relaxed italic pl-3 border-l-2 border-emerald-100">{item.tujuanPembelajaran}</div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <button onClick={() => deleteDoc(doc(db, "analisis", item.id))} className="p-2 text-slate-300 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  );
                })}
                {filteredAnalisis.length === 0 && <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic font-bold">Belum ada hasil analisis linear. Klik tombol ANALISIS LINEAR pada CP di samping.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalisisManager;
