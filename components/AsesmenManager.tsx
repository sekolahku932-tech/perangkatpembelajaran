
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Fase, Kelas, Siswa, AsesmenNilai, AsesmenInstrumen, ATPItem, MATA_PELAJARAN, SchoolSettings, User, KisiKisiItem } from '../types';
import { 
  Plus, Trash2, Loader2, Cloud, Printer, CheckCircle2, AlertTriangle, 
  PenTool, BarChart3, Wand2, ChevronRight, FileDown, Sparkles, Lock, Eye, EyeOff, AlertCircle, X
} from 'lucide-react';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from '../services/firebase';
import { generateIndikatorSoal, generateButirSoal } from '../services/geminiService';

interface AsesmenManagerProps {
  type: 'formatif' | 'sumatif';
  user: User;
}

const AsesmenManager: React.FC<AsesmenManagerProps> = ({ type, user }) => {
  const [activeTab, setActiveTab] = useState<'KISI_KISI' | 'SOAL'>('KISI_KISI');
  const [fase, setFase] = useState<Fase>(Fase.A);
  const [kelas, setKelas] = useState<Kelas>('1');
  const [semester, setSemester] = useState<'1' | '2'>('1');
  const [mapel, setMapel] = useState<string>(MATA_PELAJARAN[1]);
  const [namaAsesmen, setNamaAsesmen] = useState<string>('SUMATIF AKHIR SEMESTER');
  const [isPrintMode, setIsPrintMode] = useState(false);
  
  const [hariTanggal, setHariTanggal] = useState('');
  const [waktuPengerjaan, setWaktuPengerjaan] = useState('90 Menit');
  
  const [tps, setTps] = useState<ATPItem[]>([]);
  const [kisikisi, setKisikisi] = useState<KisiKisiItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [aiLoadingMap, setAiLoadingMap] = useState<Record<string, boolean>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showAddAsesmenModal, setShowAddAsesmenModal] = useState(false);
  const [modalInputValue, setModalInputValue] = useState('');

  const printRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: 'SD NEGERI 5 BILATO',
    address: 'Jl. Trans Sulawesi Desa Bumela Kecamatan Bilato Kabupaten Gorontalo',
    principalName: 'Nama Kepala Sekolah',
    principalNip: '-'
  });
  
  const [activeYear, setActiveYear] = useState('2024/2025');

  useEffect(() => {
    if (user.role === 'guru') {
      if (user.kelas !== '-' && user.kelas !== 'Multikelas') {
        setKelas(user.kelas as Kelas);
        updateFaseByKelas(user.kelas as Kelas);
      }
      if (user.mapelDiampu && user.mapelDiampu.length > 0) {
        if (!user.mapelDiampu.includes(mapel)) {
          setMapel(user.mapelDiampu[0]);
        }
      }
    }
  }, [user]);

  const updateFaseByKelas = (kls: Kelas) => {
    if (['1', '2'].includes(kls)) setFase(Fase.A);
    else if (['3', '4'].includes(kls)) setFase(Fase.B);
    else if (['5', '6'].includes(kls)) setFase(Fase.C);
  };

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "school_info"), (snap) => {
      if (snap.exists()) setSettings(snap.data() as SchoolSettings);
    });
    const unsubYears = onSnapshot(collection(db, "academic_years"), (snap) => {
      const active = snap.docs.find(d => d.data().isActive);
      if (active) setActiveYear(active.data().year);
    });
    return () => { unsubSettings(); unsubYears(); };
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubAtp = onSnapshot(collection(db, "atp"), (snapshot) => {
      setTps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ATPItem[]);
    });
    const unsubKisikisi = onSnapshot(collection(db, "kisikisi"), (snapshot) => {
      setKisikisi(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as KisiKisiItem[]);
      setLoading(false);
    });
    return () => { unsubAtp(); unsubKisikisi(); };
  }, []);

  const filteredKisikisi = useMemo(() => {
    return kisikisi.filter(k => 
      k.fase === fase && k.kelas === kelas && k.semester === semester && k.mataPelajaran === mapel &&
      (namaAsesmen === '' || k.namaAsesmen === namaAsesmen)
    ).sort((a, b) => a.nomorSoal - b.nomorSoal);
  }, [kisikisi, fase, kelas, semester, mapel, namaAsesmen]);

  const availableMapel = user.role === 'admin' ? MATA_PELAJARAN : user.mapelDiampu;

  const availableAsesmenNames = useMemo(() => {
    const names = kisikisi
      .filter(k => k.fase === fase && k.kelas === kelas && k.semester === semester && k.mataPelajaran === mapel)
      .map(k => k.namaAsesmen);
    return Array.from(new Set(names)).sort();
  }, [kisikisi, fase, kelas, semester, mapel]);

  const handleAddKisikisiRow = async (customName?: string) => {
    const nameToUse = customName || namaAsesmen;
    if (!nameToUse) { setShowAddAsesmenModal(true); return; }
    try {
      const nextNo = filteredKisikisi.length > 0 ? Math.max(...filteredKisikisi.map(k => k.nomorSoal)) + 1 : 1;
      await addDoc(collection(db, "kisikisi"), {
        fase, kelas, semester, mataPelajaran: mapel, namaAsesmen: nameToUse,
        elemen: '', cp: '', kompetensi: 'Pengetahuan dan Pemahaman', tpId: '', tujuanPembelajaran: '',
        indikatorSoal: '', jenis: 'Tes', bentukSoal: 'Pilihan Ganda', soal: '', kunciJawaban: '', nomorSoal: nextNo
      });
      if (customName) setNamaAsesmen(customName);
    } catch (e) { console.error(e); }
  };

  const handleCreateNewAsesmen = async () => {
    if (!modalInputValue.trim()) return;
    const newName = modalInputValue.trim().toUpperCase();
    await handleAddKisikisiRow(newName);
    setModalInputValue('');
    setShowAddAsesmenModal(false);
  };

  const updateKisiKisi = async (id: string, field: keyof KisiKisiItem, value: any) => {
    try {
      const updateData: any = { [field]: value };
      if (field === 'tpId') {
        const atp = tps.find(t => t.id === value);
        if (atp) {
          updateData.tujuanPembelajaran = atp.tujuanPembelajaran;
          updateData.elemen = atp.elemen;
          updateData.cp = atp.capaianPembelajaran;
        }
      }
      await updateDoc(doc(db, "kisikisi", id), updateData);
    } catch (e) { console.error(e); }
  };

  const generateIndikatorAI = async (item: KisiKisiItem) => {
    if (!item.tujuanPembelajaran) return;
    setAiLoadingMap(prev => ({ ...prev, [`ind-${item.id}`]: true }));
    try {
      const indikator = await generateIndikatorSoal(item);
      await updateKisiKisi(item.id, 'indikatorSoal', indikator);
    } catch (e: any) {
      alert("Gagal memanggil AI: " + e.message);
    } finally { 
      setAiLoadingMap(prev => ({ ...prev, [`ind-${item.id}`]: false })); 
    }
  };

  const generateSoalAI = async (item: KisiKisiItem) => {
    if (!item.indikatorSoal) return;
    setAiLoadingMap(prev => ({ ...prev, [`soal-${item.id}`]: true }));
    try {
      const result = await generateButirSoal(item);
      await updateDoc(doc(db, "kisikisi", item.id), { soal: result.soal, kunciJawaban: result.kunci });
    } catch (e: any) {
      alert("Gagal memanggil AI: " + e.message);
    } finally { 
      setAiLoadingMap(prev => ({ ...prev, [`soal-${item.id}`]: false })); 
    }
  };

  const renderSoalContent = (content: string, isPrint = false) => {
    if (!content) return null;
    if (!content.includes('|')) return <div className="whitespace-pre-wrap">{content}</div>;
    const lines = content.split('\n');
    const tableLines: string[] = [];
    const textBefore: string[] = [];
    const textAfter: string[] = [];
    let foundTable = false;
    let tableDone = false;

    lines.forEach(line => {
      const trimmed = line.trim();
      const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|');
      if (isTableRow && !tableDone) { foundTable = true; tableLines.push(line); } 
      else if (foundTable) { tableDone = true; textAfter.push(line); } 
      else { textBefore.push(line); }
    });

    if (tableLines.length > 0) {
      const rows: string[][] = [];
      tableLines.forEach(line => {
        if (!line.includes('---')) {
          const cells = line.split('|').filter((cell, i, arr) => (i > 0 && i < arr.length - 1)).map(c => c.trim());
          if (cells.length > 0) rows.push(cells);
        }
      });
      return (
        <div className="space-y-3">
          {textBefore.length > 0 && <div className="whitespace-pre-wrap">{textBefore.join('\n').trim()}</div>}
          <table className={`border-collapse border border-black w-full ${isPrint ? 'text-[10px]' : 'text-[12px]'} mt-2`}>
            <thead><tr className="bg-slate-50">{rows[0]?.map((cell, i) => (<th key={i} className="border border-black p-2 font-black text-center">{cell}</th>))}</tr></thead>
            <tbody>{rows.slice(1).map((row, ri) => (<tr key={ri}>{row.map((cell, ci) => (<td key={ci} className={`border border-black p-2 ${ci === 0 ? 'text-left' : 'text-center font-bold'}`}>{cell}</td>))}</tr>))}</tbody>
          </table>
          {textAfter.length > 0 && <div className="whitespace-pre-wrap">{textAfter.join('\n').trim()}</div>}
        </div>
      );
    }
    return <div className="whitespace-pre-wrap">{content}</div>;
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Asesmen - SDN 5 Bilato</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Inter', sans-serif; background: white; padding: 40px; }
              @media print { 
                .no-print { display: none !important; }
                body { padding: 0; }
              }
              table { border-collapse: collapse; width: 100% !important; }
              .break-inside-avoid { page-break-inside: avoid; }
            </style>
          </head>
          <body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
            <div class="max-w-[21cm] mx-auto bg-white">
              ${content}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const KopSoalFormal = ({ activeTab }: { activeTab: string }) => (
    <div className="mb-8">
      {activeTab !== 'KISI_KISI' && (
        <div className="text-center space-y-0.5 border-b-[4px] border-double border-black pb-4 mb-8">
          <h1 className="text-lg font-bold uppercase">PEMERINTAH KABUPATEN GORONTALO</h1>
          <h2 className="text-2xl font-black uppercase">{settings.schoolName}</h2>
          <p className="text-[11px] italic">{settings.address}</p>
        </div>
      )}
      <div className="text-center mb-6">
        <h3 className="text-lg font-black uppercase">{namaAsesmen}</h3>
        <h4 className="text-lg font-black uppercase">TAHUN PELAJARAN {activeYear}</h4>
      </div>
      <div className={`${activeTab === 'KISI_KISI' ? '' : 'border-[1.5px] border-black rounded-[2rem] p-6 mb-8'}`}>
        <div className="grid grid-cols-2 gap-x-10 text-[12px] font-bold">
          <div className="space-y-2">
            <div className="flex"><span className="w-32">Mata Pelajaran</span><span className="mr-2">:</span><span className="flex-1 uppercase font-black">{mapel}</span></div>
            <div className="flex"><span className="w-32">Fase / Kelas</span><span className="mr-2">:</span><span className="flex-1">{fase} / {kelas}</span></div>
            <div className="flex"><span className="w-32">Semester</span><span className="mr-2">:</span><span className="flex-1">{semester === '1' ? 'Ganjil' : 'Genap'}</span></div>
          </div>
          {activeTab !== 'KISI_KISI' && (
            <div className="space-y-2">
              <div className="flex items-center"><span className="w-32">Hari / Tanggal</span><span className="mr-2">:</span><div className="flex-1 border-b border-dotted border-black min-h-[16px]">{hariTanggal}</div></div>
              <div className="flex items-center"><span className="w-32">Waktu</span><span className="mr-2">:</span><div className="flex-1 font-black">{waktuPengerjaan}</div></div>
              <div className="flex items-center"><span className="w-32">Nama Siswa</span><span className="mr-2">:</span><div className="flex-1 border-b border-dotted border-black min-h-[16px]"></div></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const isClassLocked = user.role === 'guru' && user.teacherType === 'kelas';

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {showAddAsesmenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-md overflow-hidden animate-in zoom-in-95">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900 uppercase">Buat Asesmen Baru</h3>
                <button onClick={() => setShowAddAsesmenModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Judul Asesmen / Ujian</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black uppercase focus:ring-2 focus:ring-rose-600 outline-none"
                    value={modalInputValue}
                    onChange={e => setModalInputValue(e.target.value)}
                    placeholder="CONTOH: SUMATIF TENGAH SEMESTER"
                    autoFocus
                  />
                </div>
                <button 
                  onClick={handleCreateNewAsesmen}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-rose-100 transition-all flex items-center justify-center gap-2 mt-4 uppercase text-xs"
                >
                  <Plus size={18}/> BUAT SEKARANG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg"><BarChart3 size={24} /></div>
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button onClick={() => setActiveTab('KISI_KISI')} className={`px-5 py-2 rounded-xl text-[10px] font-black ${activeTab === 'KISI_KISI' ? 'bg-white text-rose-600' : 'text-slate-500'}`}>KISI-KISI</button>
              <button onClick={() => setActiveTab('SOAL')} className={`px-5 py-2 rounded-xl text-[10px] font-black ${activeTab === 'SOAL' ? 'bg-white text-rose-600' : 'text-slate-500'}`}>NASKAH SOAL</button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddAsesmenModal(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg hover:bg-indigo-700">
              <Plus size={16}/> BUAT BARU
            </button>
            <button onClick={() => setIsPrintMode(true)} className="bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg hover:bg-black"><Printer size={16}/> PRATINJAU</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6 p-5 bg-slate-50 rounded-2xl">
          <div>
            <label className="text-[10px] font-black text-slate-400 block mb-1 flex items-center gap-1">
              FASE {isClassLocked && <Lock size={8} className="text-amber-500" />}
            </label>
            <select 
              disabled={isClassLocked}
              className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400" 
              value={fase} 
              onChange={e => setFase(e.target.value as Fase)}
            >
              {Object.values(Fase).map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 block mb-1 flex items-center gap-1">
              KELAS {isClassLocked && <Lock size={8} className="text-amber-500" />}
            </label>
            <select 
              disabled={isClassLocked}
              className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400" 
              value={kelas} 
              onChange={e => setKelas(e.target.value as Kelas)}
            >
              {fase === Fase.A && <><option value="1">1</option><option value="2">2</option></>}
              {fase === Fase.B && <><option value="3">3</option><option value="4">4</option></>}
              {fase === Fase.C && <><option value="5">5</option><option value="6">6</option></>}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 block mb-1">MAPEL</label>
            <select className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold" value={mapel} onChange={e => setMapel(e.target.value)}>
              {availableMapel.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 block mb-1">ASESMEN</label><select className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold" value={namaAsesmen} onChange={e => setNamaAsesmen(e.target.value)}><option value="">Pilih Asesmen</option>{availableAsesmenNames.map(n => <option key={n}>{n}</option>)}</select></div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4 text-slate-400"><Loader2 size={48} className="animate-spin text-rose-600" /><p className="font-black text-xs uppercase tracking-widest">Sinkronisasi Cloud...</p></div>
        ) : activeTab === 'KISI_KISI' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1500px]">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black h-12 uppercase tracking-widest">
                  <th className="px-6 py-2 w-16 text-center">No</th>
                  <th className="px-6 py-2 w-56">Elemen & TP</th>
                  <th className="px-6 py-2 w-64">Indikator Soal (AI)</th>
                  <th className="px-6 py-2 w-40 text-center">Bentuk</th>
                  <th className="px-6 py-2 w-96">Butir Soal</th>
                  <th className="px-6 py-2 w-32 text-center">Kunci</th>
                  <th className="px-6 py-2 w-20 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredKisikisi.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 align-top transition-colors">
                    <td className="px-6 py-4 text-center font-black text-slate-300">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[10px] font-bold mb-1" value={item.tpId} onChange={e => updateKisiKisi(item.id, 'tpId', e.target.value)}>
                        <option value="">Pilih TP</option>
                        {tps.filter(t => t.kelas === kelas && t.mataPelajaran === mapel).map(t => <option key={t.id} value={t.id}>{t.tujuanPembelajaran}</option>)}
                      </select>
                      <div className="text-[9px] text-slate-500 italic leading-tight">{item.tujuanPembelajaran}</div>
                    </td>
                    <td className="px-6 py-4 relative group">
                      <textarea className="w-full bg-white border border-slate-200 rounded-xl p-2 text-[10px] font-medium min-h-[80px]" value={item.indikatorSoal} onChange={e => updateKisiKisi(item.id, 'indikatorSoal', e.target.value)} />
                      <button onClick={() => generateIndikatorAI(item)} className="absolute bottom-6 right-8 text-indigo-600 bg-white p-1 rounded shadow-sm">
                        {aiLoadingMap[`ind-${item.id}`] ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14}/>}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <select className="w-full text-[10px] font-bold p-1 border rounded" value={item.bentukSoal} onChange={e => updateKisiKisi(item.id, 'bentukSoal', e.target.value)}><option>Pilihan Ganda</option><option>Pilihan Ganda Kompleks</option><option>Isian</option><option>Uraian</option></select>
                    </td>
                    <td className="px-6 py-4 relative group">
                       <textarea className="w-full bg-white border border-slate-200 rounded-xl p-2 text-[11px] font-medium min-h-[140px]" value={item.soal} onChange={e => updateKisiKisi(item.id, 'soal', e.target.value)} />
                       <button onClick={() => generateSoalAI(item)} className="absolute bottom-6 right-8 bg-rose-600 text-white p-1.5 rounded-lg shadow-md">
                         {aiLoadingMap[`soal-${item.id}`] ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14}/>}
                       </button>
                    </td>
                    <td className="px-6 py-4 text-center"><input className="w-full text-[10px] text-center font-medium p-1 border rounded" value={item.kunciJawaban} onChange={e => updateKisiKisi(item.id, 'kunciJawaban', e.target.value)} /></td>
                    <td className="px-6 py-4 text-center"><button onClick={() => deleteDoc(doc(db, "kisikisi", item.id))} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></td>
                  </tr>
                ))}
                <tr><td colSpan={7} className="p-4"><button onClick={() => handleAddKisikisiRow()} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-black text-slate-400 hover:border-rose-300 hover:text-rose-500 transition-all">+ TAMBAH BARIS</button></td></tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 space-y-8 bg-slate-50">
             <div className="max-w-3xl mx-auto space-y-4">
                <div className="grid grid-cols-2 gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Hari / Tanggal Pelaksanaan</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold" value={hariTanggal} onChange={e => setHariTanggal(e.target.value)} placeholder="Contoh: Senin, 12 Juni 2024" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Alokasi Waktu</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold" value={waktuPengerjaan} onChange={e => setWaktuPengerjaan(e.target.value)} placeholder="Contoh: 90 Menit" />
                  </div>
                </div>
                {filteredKisikisi.map(item => (
                    <div key={item.id} className="flex gap-4 items-start p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                      <span className="font-black text-slate-300">{item.nomorSoal}.</span>
                      <div className="flex-1">{renderSoalContent(item.soal)}</div>
                    </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AsesmenManager;
