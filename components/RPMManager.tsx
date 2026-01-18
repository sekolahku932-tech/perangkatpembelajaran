
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Fase, Kelas, RPMItem, ATPItem, PromesItem, CapaianPembelajaran, MATA_PELAJARAN, DIMENSI_PROFIL, SchoolSettings, User } from '../types';
import { Plus, Trash2, Rocket, Sparkles, Loader2, CheckCircle2, Printer, Cloud, FileText, Split, AlertTriangle, FileDown, Wand2, PencilLine, Lock, Brain, Zap, RefreshCw, PenTool, Search, AlertCircle, X, CheckSquare, Square, Cpu, ClipboardList, BookOpen, Heart, Stars } from 'lucide-react';
import { generateRPMContent, generateAssessmentDetails, recommendPedagogy } from '../services/geminiService';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from '../services/firebase';

interface RubricItem {
  aspek: string;
  level4: string;
  level3: string;
  level2: string;
  level1: string;
}

interface AsesmenRow {
  kategori: string;
  teknik: string;
  bentuk: string;
  instruksi?: string;
  instrumen?: string[];
  rubrikDetail?: RubricItem[];
}

interface RPMManagerProps {
  user: User;
}

const RPMManager: React.FC<RPMManagerProps> = ({ user }) => {
  const [rpmList, setRpmList] = useState<RPMItem[]>([]);
  const [atpData, setAtpData] = useState<ATPItem[]>([]);
  const [cps, setCps] = useState<CapaianPembelajaran[]>([]);
  const [promesData, setPromesData] = useState<PromesItem[]>([]);
  const [loading, setLoading] = useState(true);

  const filterFase = Fase.C; // Locked
  const filterKelas = '5'; // Locked
  const [filterSemester, setFilterSemester] = useState<'1' | '2'>('1');
  const [filterMapel, setFilterMapel] = useState<string>(MATA_PELAJARAN[0]);
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isLoadingPedagogyAI, setIsLoadingPedagogyAI] = useState(false);
  const [isLoadingAsesmenAI, setIsLoadingAsesmenAI] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: 'SDN SONDANA',
    address: 'Kecamatan Bilato, Kabupaten Gorontalo',
    principalName: 'Nama Kepala Sekolah',
    principalNip: '-'
  });
  
  const [activeYear, setActiveYear] = useState('2025/2026');

  useEffect(() => {
    if (user.role === 'guru' && user.mapelDiampu && user.mapelDiampu.length > 0) {
      if (!user.mapelDiampu.includes(filterMapel)) {
        setFilterMapel(user.mapelDiampu[0]);
      }
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const unsubSettings = onSnapshot(doc(db, "settings", "school_info"), (snap) => {
      if (snap.exists()) setSettings(snap.data() as SchoolSettings);
    });
    const unsubYears = onSnapshot(collection(db, "academic_years"), (snap) => {
      const active = snap.docs.find((d: any) => d.data().isActive);
      if (active) setActiveYear(active.data().year);
    });
    const unsubRpm = onSnapshot(collection(db, "rpm"), (snapshot) => {
      setRpmList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RPMItem[]);
    });
    const unsubAtp = onSnapshot(collection(db, "atp"), (snapshot) => {
      setAtpData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ATPItem[]);
    });
    const unsubCps = onSnapshot(collection(db, "cps"), (snapshot) => {
      setCps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CapaianPembelajaran[]);
    });
    const unsubPromes = onSnapshot(collection(db, "promes"), (snapshot) => {
      setPromesData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PromesItem[]);
      setLoading(false);
    });
    return () => { unsubSettings(); unsubYears(); unsubRpm(); unsubAtp(); unsubCps(); unsubPromes(); };
  }, []);

  const currentRpm = useMemo(() => {
    if (!isEditing) return null;
    return rpmList.find(r => r.id === isEditing) || null;
  }, [rpmList, isEditing]);

  const sortedAtpOptions = useMemo(() => {
    const filtered = atpData.filter(a => 
      a.fase === filterFase && 
      a.kelas === filterKelas && 
      (a.mataPelajaran || '').trim().toLowerCase() === filterMapel.trim().toLowerCase()
    );
    return filtered.sort((a, b) => (a.indexOrder || 0) - (b.indexOrder || 0));
  }, [atpData, filterFase, filterKelas, filterMapel]);

  const sortedRPM = useMemo(() => {
    const filtered = rpmList.filter(r => r.fase === filterFase && r.kelas === filterKelas && r.semester === filterSemester && r.mataPelajaran === filterMapel);
    return filtered.sort((a, b) => {
      const atpA = atpData.find(atp => atp.tujuanPembelajaran === a.tujuanPembelajaran);
      const atpB = atpData.find(atp => atp.tujuanPembelajaran === b.tujuanPembelajaran);
      return (atpA?.indexOrder || 99) - (atpB?.indexOrder || 99);
    });
  }, [rpmList, atpData, filterFase, filterKelas, filterSemester, filterMapel]);

  const splitByMeeting = (text: string, count: number) => {
    if (!text) return Array(count).fill('');
    const pattern = /Pertemuan\s*\d+\s*:?/gi;
    const parts = text.split(pattern).filter(p => p !== undefined);
    if (parts[0]?.trim() === '') parts.shift();
    const result = Array(count).fill('');
    for (let i = 0; i < count; i++) {
      result[i] = (parts[i] || '').trim();
    }
    return result;
  };

  const highlightContent = (content: string) => {
    const mappings = [
      { word: 'Berkesadaran', color: 'bg-indigo-100 text-indigo-900 border-indigo-400' },
      { word: 'Bermakna', color: 'bg-emerald-100 text-emerald-900 border-emerald-400' },
      { word: 'Menggembirakan', color: 'bg-rose-100 text-rose-900 border-rose-400' },
      { word: 'Mindful', color: 'bg-indigo-100 text-indigo-900 border-indigo-400' },
      { word: 'Meaningful', color: 'bg-emerald-100 text-emerald-900 border-emerald-400' },
      { word: 'Joyful', color: 'bg-rose-100 text-rose-900 border-rose-400' }
    ];
    let result = content;
    mappings.forEach(m => {
      const regex = new RegExp(`\\[${m.word}\\]`, 'gi');
      result = result.replace(regex, `<span class="px-1.5 py-0.5 mx-0.5 ${m.color} text-[8px] font-black rounded border-b-2 uppercase">${m.word}</span>`);
      
      const rawRegex = new RegExp(`\\b(${m.word})\\b`, 'gi');
      result = result.replace(rawRegex, `<span class="font-black text-slate-900 underline decoration-2 decoration-amber-400">$1</span>`);
    });
    return result;
  };

  const renderListContent = (text: string | undefined, cleanMeetingTags: boolean = false) => {
    if (!text) return '-';
    let processedText = text;
    if (cleanMeetingTags) processedText = text.replace(/Pertemuan\s*\d+\s*:?\s*/gi, '');
    
    let lines = processedText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length === 1) {
      const potentialSteps = processedText.split(/(?<=\.)\s+(?=\d+\.|\-|\*|[A-Z])/g).map(s => s.trim()).filter(s => s.length > 0);
      if (potentialSteps.length > 1) {
        lines = potentialSteps;
      }
    }

    return (
      <ul className="space-y-3 list-none">
        {lines.map((step, i) => {
          const cleanedStep = step.replace(/^(\d+\.|\-|\*)\s*/, '');
          return (
            <li key={i} className="flex gap-3 items-start">
              <div className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px] font-black mt-0.5">{i + 1}</div>
              <span className="leading-relaxed text-justify flex-1" dangerouslySetInnerHTML={{ __html: highlightContent(cleanedStep) }}></span>
            </li>
          );
        })}
      </ul>
    );
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak RPM - SDN SONDANA</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Inter', sans-serif; background: white; padding: 20px; font-size: 10pt; }
              @media print { 
                .no-print { display: none !important; }
                body { padding: 0; }
              }
              table { border-collapse: collapse; width: 100%; border: 2px solid black; }
              th, td { border: 1px solid black; padding: 5px; }
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
    const rpm = currentRpm;
    if (!rpm) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>RPM</title><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 5px; font-family: 'Arial'; font-size: 10pt; vertical-align: top; } .text-center { text-align: center; } .font-bold { font-weight: bold; } .bg-gray { background-color: #f3f4f6; }</style></head><body>`;
    const footer = "</body></html>";
    let tableHtml = `
      <div style="text-align:center">
        <h2 style="margin:0">RENCANA PEMBELAJARAN MENDALAM (RPM)</h2>
        <h3 style="margin:5px 0">${settings.schoolName}</h3>
      </div>
      <br/>
      <table>
        <tr><td style="width:150px; background-color:#f3f4f6">Penyusun</td><td>${user.name}</td></tr>
        <tr><td style="background-color:#f3f4f6">Mata Pelajaran</td><td>${rpm.mataPelajaran}</td></tr>
        <tr><td style="background-color:#f3f4f6">Kelas / Fase</td><td>${rpm.kelas} / ${rpm.fase}</td></tr>
        <tr><td style="background-color:#f3f4f6">Topik / Materi</td><td><b>${rpm.materi.toUpperCase()}</b></td></tr>
        <tr><td style="background-color:#f3f4f6">Alokasi Waktu</td><td>${rpm.alokasiWaktu}</td></tr>
      </table>
      <br/>
      <h3>I. TUJUAN PEMBELAJARAN</h3>
      <p>${rpm.tujuanPembelajaran}</p>
      <br/>
      <h3>II. LANGKAH PEMBELAJARAN (INTEGRASI 3 PRINSIP)</h3>
      <p>Setiap tahapan mengandung unsur Berkesadaran, Bermakna, dan Menggembirakan.</p>
      <br/>
      <h4>1. Memahami (Awal / Koneksi)</h4>
      <p>${(rpm.kegiatanAwal || '').replace(/\n/g, '<br/>')}</p>
      <h4>2. Mengaplikasi (Inti / Aksi)</h4>
      <p>${(rpm.kegiatanInti || '').replace(/\n/g, '<br/>')}</p>
      <h4>3. Merefleksi (Penutup / Refleksi)</h4>
      <p>${(rpm.kegiatanPenutup || '').replace(/\n/g, '<br/>')}</p>
    `;
    const blob = new Blob(['\ufeff', header + tableHtml + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RPM_Integrasi_${rpm.materi.replace(/ /g, '_')}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderAsesmenTable = (data: AsesmenRow[], isPrint: boolean = false) => {
    return (
      <div className="space-y-8">
        {data.map((row, idx) => (
          <div key={idx} className="break-inside-avoid">
            <div className="flex items-center gap-3 mb-3 border-b-2 border-slate-900 pb-2">
              <div className="bg-slate-900 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">{row.kategori}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{row.teknik} | {row.bentuk}</div>
            </div>
            {row.instruksi && <p className="text-[10pt] mb-3 italic text-slate-600">Instruksi Guru: {row.instruksi}</p>}
            <table className={`w-full border-collapse border-2 border-black ${isPrint ? 'text-[9px]' : 'text-[11px]'}`}>
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-2 border-black p-1 w-1/4 uppercase font-black">ASPEK / KRITERIA</th>
                  <th className="border-2 border-black p-1 uppercase font-black">SANGAT BAIK (4)</th>
                  <th className="border-2 border-black p-1 uppercase font-black">BAIK (3)</th>
                  <th className="border-2 border-black p-1 uppercase font-black">CUKUP (2)</th>
                  <th className="border-2 border-black p-1 uppercase font-black">PERLU BIMBINGAN (1)</th>
                </tr>
              </thead>
              <tbody>
                {row.rubrikDetail?.map((detail, dIdx) => (
                  <tr key={dIdx}>
                    <td className="border-2 border-black p-1.5 font-bold uppercase bg-slate-50/30">{detail.aspek}</td>
                    <td className="border-2 border-black p-1.5 leading-tight">{detail.level4}</td>
                    <td className="border-2 border-black p-1.5 leading-tight">{detail.level3}</td>
                    <td className="border-2 border-black p-1.5 leading-tight">{detail.level2}</td>
                    <td className="border-2 border-black p-1.5 leading-tight">{detail.level1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  };

  const handleAddRPM = async () => {
    try {
      const docRef = await addDoc(collection(db, "rpm"), {
        atpId: '', fase: filterFase, kelas: filterKelas, semester: filterSemester, mataPelajaran: filterMapel,
        tujuanPembelajaran: '', materi: '', subMateri: '', alokasiWaktu: '', jumlahPertemuan: 1,
        asesmenAwal: '', dimensiProfil: [], praktikPedagogis: '', kemitraan: '',
        lingkunganBelajar: '', pemanfaatanDigital: '', kegiatanAwal: '', kegiatanInti: '', kegiatanPenutup: '', asesmenTeknik: ''
      });
      setIsEditing(docRef.id);
    } catch (e) { setMessage({ text: 'Gagal membuat RPM', type: 'error' }); }
  };

  const updateRPM = async (id: string, field: keyof RPMItem, value: any) => {
    try { await updateDoc(doc(db, "rpm", id), { [field]: value }); } catch (e) { console.error(e); }
  };

  const syncWithATP = async (id: string, atpId: string) => {
    const atp = atpData.find(a => a.id === atpId);
    if (!atp) return;
    const promes = promesData.find(p => p.tujuanPembelajaran === atp.tujuanPembelajaran);
    const selectedDimensi: string[] = [];
    const rawText = ((atp.dimensiProfilLulusan || '') + ' ' + (atp.tujuanPembelajaran || '')).toLowerCase();
    const mapping = [
      { key: DIMENSI_PROFIL[0], words: ['keimanan', 'ketakwaan', 'beriman', 'takwa', 'akhlak', 'tuhan', 'esa'] }, 
      { key: DIMENSI_PROFIL[1], words: ['kewargaan', 'kebinekaan', 'global', 'negara', 'warga'] },       
      { key: DIMENSI_PROFIL[2], words: ['penalaran kritis', 'bernalar kritis', 'kritis', 'analisis', 'logis'] },    
      { key: DIMENSI_PROFIL[3], words: ['kreativitas', 'kreatif', 'karya', 'cipta'] },                           
      { key: DIMENSI_PROFIL[4], words: ['kolaborasi', 'gotong royong', 'kerjasama', 'tim', 'bersama'] },          
      { key: DIMENSI_PROFIL[5], words: ['kemandirian', 'mandiri', 'sendiri', 'disiplin'] },                           
      { key: DIMENSI_PROFIL[6], words: ['kesehatan', 'jasmani', 'sehat', 'olahraga', 'fisik'] },                    
      { key: DIMENSI_PROFIL[7], words: ['komunikasi', 'bahasa', 'bicara', 'presentasi', 'interaksi'] }                    
    ];
    mapping.forEach(m => { if (m.words.some(word => rawText.includes(word))) selectedDimensi.push(m.key); });
    try {
      await updateDoc(doc(db, "rpm", id), {
        atpId, tujuanPembelajaran: atp.tujuanPembelajaran, materi: atp.materi, subMateri: atp.subMateri,
        alokasiWaktu: promes?.alokasiWaktu || atp.alokasiWaktu, asesmenAwal: atp.asesmenAwal, dimensiProfil: selectedDimensi
      });
      setMessage({ text: 'Sync Berhasil!', type: 'success' });
    } catch (e) { console.error(e); }
  };

  const handleGenerateAI = async (id: string) => {
    const rpm = rpmList.find(r => r.id === id);
    if (!rpm || !rpm.tujuanPembelajaran) { setMessage({ text: 'Pilih TP dulu!', type: 'warning' }); return; }
    setIsLoadingAI(true);
    try {
      const result = await generateRPMContent(
        rpm.tujuanPembelajaran, 
        rpm.materi, 
        rpm.kelas, 
        rpm.praktikPedagogis || "Aktif", 
        rpm.alokasiWaktu, 
        rpm.jumlahPertemuan || 1,
        user.apiKey
      );
      if (result) { 
        await updateDoc(doc(db, "rpm", id), { ...result }); 
        setMessage({ text: 'Narasi Integrasi Deep Learning Berhasil disusun!', type: 'success' }); 
      }
    } catch (err: any) { 
      console.error(err);
      setMessage({ text: 'AI Gagal: ' + (err.message || 'Cek kuota API'), type: 'error' }); 
    }
    finally { setIsLoadingAI(false); }
  };

  const handleGenerateAsesmenAI = async (id: string) => {
    const rpm = rpmList.find(r => r.id === id);
    if (!rpm || !rpm.tujuanPembelajaran) { setMessage({ text: 'Isi TP dulu!', type: 'warning' }); return; }
    setIsLoadingAsesmenAI(true);
    try {
      const result = await generateAssessmentDetails(
        rpm.tujuanPembelajaran, 
        rpm.materi, 
        rpm.kelas, 
        user.apiKey
      );
      if (result) { 
        await updateDoc(doc(db, "rpm", id), { asesmenTeknik: result }); 
        setMessage({ text: '3 Rubrik Asesmen Selesai disusun!', type: 'success' }); 
      }
    } catch (err: any) { 
      console.error(err);
      setMessage({ text: 'Gagal menyusun Rubrik: ' + (err.message || 'Error AI'), type: 'error' }); 
    } finally { setIsLoadingAsesmenAI(false); }
  };

  const parseAsesmen = (json: string): AsesmenRow[] | null => { 
    if (!json || json.trim() === '') return null;
    try { 
      const parsed = JSON.parse(json); 
      return Array.isArray(parsed) ? parsed : null; 
    } catch (e) { 
      console.error("JSON Parse Error on Asesmen:", e);
      return null; 
    } 
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, "rpm", deleteConfirmId));
      setDeleteConfirmId(null);
      setMessage({ text: 'Dihapus!', type: 'success' });
    } catch (e) { setMessage({ text: 'Gagal!', type: 'error' }); }
  };

  const getRPMDate = (rpm: RPMItem) => {
    const matchingPromes = promesData.find(p => p.tujuanPembelajaran === rpm.tujuanPembelajaran && p.kelas === rpm.kelas && p.mataPelajaran === rpm.mataPelajaran);
    if (!matchingPromes || !matchingPromes.bulanPelaksanaan) return new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
    const dates = matchingPromes.bulanPelaksanaan.split(',');
    const lastDateRaw = dates[dates.length - 1]; 
    const parts = lastDateRaw.split('|');
    if (parts.length < 3) return new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
    const month = parts[0]; const day = parts[2];
    const yearParts = activeYear.split('/');
    const year = matchingPromes.semester === '1' ? yearParts[0] : yearParts[1];
    return `${day} ${month} ${year}`;
  };

  const handleRecommendPedagogy = async (id: string) => {
    const rpm = rpmList.find(r => r.id === id);
    if (!rpm || !rpm.atpId) return;
    const atp = atpData.find(a => a.id === rpm.atpId);
    if (!atp) return;
    setIsLoadingPedagogyAI(true);
    try {
      const result = await recommendPedagogy(rpm.tujuanPembelajaran, atp.alurTujuanPembelajaran, rpm.materi, rpm.kelas, user.apiKey);
      if (result) { await updateDoc(doc(db, "rpm", id), { praktikPedagogis: result.modelName }); setMessage({ text: `Rekomendasi AI: ${result.modelName}.`, type: 'info' }); }
    } catch (err) { setMessage({ text: 'Gagal mendapatkan rekomendasi AI', type: 'error' }); } finally { setIsLoadingPedagogyAI(false); }
  };

  if (isPrintMode && isEditing && currentRpm) {
    const rpm = currentRpm;
    const count = rpm.jumlahPertemuan || 1;
    const asesmenData = parseAsesmen(rpm.asesmenTeknik);
    const datumDate = getRPMDate(rpm);
    
    const awalParts = splitByMeeting(rpm.kegiatanAwal, count);
    const intiParts = splitByMeeting(rpm.kegiatanInti, count);
    const penutupParts = splitByMeeting(rpm.kegiatanPenutup, count);
    
    const SidebarSection = ({ title }: { title: string }) => (
      <div className="w-12 uppercase font-black text-[9px] text-black border-r-2 border-black shrink-0 text-center flex items-center justify-center bg-slate-50/50">
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{title}</span>
      </div>
    );

    return (
      <div className="bg-white min-h-screen text-slate-900 p-6 font-sans print:p-0">
        <div className="no-print mb-4 flex justify-between bg-slate-100 p-4 rounded-2xl border border-slate-200">
           <div className="flex gap-2">
             <button onClick={() => setIsPrintMode(false)} className="bg-slate-800 text-white px-6 py-2 rounded-xl text-xs font-black">KEMBALI</button>
             <button onClick={() => handleExportWord()} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black flex items-center gap-2"><FileDown size={16}/> WORD</button>
           </div>
           <button onClick={handlePrint} className="bg-rose-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-sm flex items-center gap-2"><Printer size={16}/> CETAK PDF</button>
        </div>

        <div ref={printRef} className="max-w-[21cm] mx-auto bg-white p-4 shadow-none">
          <div className="text-center mb-6 pb-2 border-b-2 border-black">
            <h1 className="text-xl font-black uppercase tracking-[0.2em] text-black">RENCANA PEMBELAJARAN MENDALAM</h1>
            <h2 className="text-sm font-bold uppercase text-slate-600">{settings.schoolName}</h2>
          </div>

          <div className="mb-6 border-2 border-black">
            <div className="bg-slate-100 border-b-2 border-black px-3 py-1 font-black text-[10px] uppercase tracking-widest">IDENTITAS</div>
            <table className="w-full text-[10.5px] border-collapse">
              <tbody>
                <tr className="border-b border-black"><td className="p-1.5 w-48 font-bold bg-slate-50 border-r-2 border-black uppercase text-[9px]">Penyusun / Satuan</td><td className="p-1.5 font-bold uppercase">{user.name} / {settings.schoolName}</td></tr>
                <tr className="border-b border-black"><td className="p-1.5 w-48 font-bold bg-slate-50 border-r-2 border-black uppercase text-[9px]">Tahun / Semester</td><td className="p-1.5">{activeYear} / {rpm.semester} ({rpm.semester === '1' ? 'Ganjil' : 'Genap'})</td></tr>
                <tr className="border-b border-black"><td className="p-1.5 w-48 font-bold bg-slate-50 border-r-2 border-black uppercase text-[9px]">Mata Pelajaran</td><td className="p-1.5 font-bold uppercase">{rpm.mataPelajaran}</td></tr>
                <tr className="border-b border-black"><td className="p-1.5 w-48 font-bold bg-slate-50 border-r-2 border-black uppercase text-[9px]">Kelas / Fase</td><td className="p-1.5 font-bold">{rpm.kelas} / {rpm.fase.replace('Fase ', '')}</td></tr>
                <tr className="border-b border-black"><td className="p-1.5 w-48 font-bold bg-slate-50 border-r-2 border-black uppercase text-[9px]">Bab / Topik Materi</td><td className="p-1.5 font-black uppercase text-blue-600">{rpm.materi} {rpm.subMateri ? `(${rpm.subMateri})` : ''}</td></tr>
                <tr><td className="p-1.5 w-48 font-bold bg-slate-50 border-r-2 border-black uppercase text-[9px]">Alokasi Waktu</td><td className="p-1.5 font-bold">{rpm.alokasiWaktu} ({count} Pertemuan)</td></tr>
              </tbody>
            </table>
          </div>

          <div className="flex border-2 border-black mb-6 break-inside-avoid">
            <SidebarSection title="IDENTIFIKASI" />
            <div className="flex-1 p-4 space-y-4">
              <div>
                 <p className="font-bold text-[9px] uppercase text-slate-500 mb-1">Asesmen Awal (Dari ATP):</p>
                 <div className="p-3 bg-slate-50 border-2 border-dotted border-slate-300 italic text-[10.5px] leading-tight rounded-xl">
                  {rpm.asesmenAwal || '-'}
                 </div>
              </div>
              <div>
                <p className="font-bold text-[9px] uppercase text-slate-500 mb-2">Dimensi Profil Lulusan (DPL):</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {DIMENSI_PROFIL.map((d, i) => {
                    const isChecked = rpm.dimensiProfil.includes(d);
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <div className="mt-0.5 transition-all">
                          {isChecked ? <CheckSquare size={12} className="text-blue-600" /> : <Square size={12} className="text-slate-300" />}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-[7px] font-black uppercase leading-none ${isChecked ? 'text-blue-600' : 'text-slate-300'}`}>DPL {i + 1}</span>
                          <span className={`text-[9.5px] font-bold leading-tight ${isChecked ? 'text-slate-900' : 'text-slate-400'}`}>{d}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex border-2 border-black mb-6 break-inside-avoid">
            <SidebarSection title="DESAIN" />
            <div className="flex-1 p-4 space-y-5">
              <div>
                <p className="font-black text-[9px] uppercase text-slate-500 mb-1">Tujuan Pembelajaran:</p>
                <div className="p-4 border-2 border-blue-600 bg-blue-50/20 rounded-[1.5rem] text-blue-900 font-black text-[12px] text-center leading-tight shadow-sm">
                  {rpm.tujuanPembelajaran}
                </div>
              </div>
              <div className="break-inside-avoid">
                <p className="font-black text-[9px] uppercase text-slate-500 mb-1">Praktik Pedagogis (Model):</p>
                <p className="text-[10.5px] leading-tight text-justify italic font-medium bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {rpm.praktikPedagogis}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-6 pt-2 border-t border-slate-100">
                <div className="space-y-1"><p className="font-black text-[9px] uppercase text-black">Kemitraan:</p><p className="text-[10.5px] leading-tight">{rpm.kemitraan || '-'}</p></div>
                <div className="space-y-1"><p className="font-black text-[9px] uppercase text-black">Lingkungan:</p><p className="text-[10.5px] leading-tight">{rpm.lingkunganBelajar || '-'}</p></div>
                <div className="space-y-1"><p className="font-black text-[9px] uppercase text-black">Digital:</p><p className="text-[10.5px] leading-tight">{rpm.pemanfaatanDigital || '-'}</p></div>
              </div>
            </div>
          </div>

          <div className="flex border-2 border-black break-inside-avoid mb-6">
            <SidebarSection title="PENGALAMAN BELAJAR" />
            <div className="flex-1">
               {Array.from({ length: count }).map((_, mIdx) => (
                  <div key={mIdx} className="p-5 space-y-6 border-b-2 last:border-b-0 border-black break-inside-avoid">
                    <div className="flex items-center gap-4">
                       <div className="bg-slate-900 text-white border-2 border-black px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">PERTEMUAN {mIdx + 1}</div>
                       <div className="flex-1 h-0.5 bg-slate-200"></div>
                    </div>
                    <div className="space-y-6">
                       <div className="relative pl-6 border-l-[6px] border-indigo-600 rounded-sm">
                          <p className="font-black text-indigo-900 text-[11px] mb-3 uppercase tracking-widest flex items-center gap-2">1. MEMAHAMI <Stars size={12}/></p>
                          <div className="text-[10.5px] text-slate-800">{renderListContent(awalParts[mIdx] || '-', true)}</div>
                       </div>
                       <div className="relative pl-6 border-l-[6px] border-emerald-600 rounded-sm">
                          <p className="font-black text-emerald-900 text-[11px] mb-3 uppercase tracking-widest flex items-center gap-2">2. MENGAPLIKASI <Heart size={12}/></p>
                          <div className="text-[10.5px] text-slate-800">{renderListContent(intiParts[mIdx] || '-', true)}</div>
                       </div>
                       <div className="relative pl-6 border-l-[6px] border-rose-600 rounded-sm">
                          <p className="font-black text-rose-900 text-[11px] mb-3 uppercase tracking-widest flex items-center gap-2">3. MEREFLEKSI <Zap size={12}/></p>
                          <div className="text-[10.5px] text-slate-800">{renderListContent(penutupParts[mIdx] || '-', true)}</div>
                       </div>
                    </div>
                  </div>
               ))}
            </div>
          </div>

          <div className="flex border-2 border-black break-inside-avoid mb-10">
            <SidebarSection title="STRATEGI ASESMEN" />
            <div className="flex-1 p-6">
               {asesmenData ? renderAsesmenTable(asesmenData, true) : <div className="italic text-slate-400 text-[9px]">Instrumen asesmen belum disusun.</div>}
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 text-center text-[10.5px] font-black uppercase tracking-tight break-inside-avoid px-8">
            <div>
               <p>MENGETAHUI,</p>
               <p>KEPALA SEKOLAH</p>
               <div className="h-20"></div>
               <p className="border-b-2 border-black inline-block min-w-[180px]">{settings.principalName}</p>
               <p className="mt-0.5 font-normal tracking-tighter">NIP. {settings.principalNip}</p>
            </div>
            <div>
               <p>BILATO, ${datumDate}</p>
               <p>GURU KELAS/MAPEL</p>
               <div className="h-20"></div>
               <p className="border-b-2 border-black inline-block min-w-[180px]">{user.name}</p>
               <p className="mt-0.5 font-normal tracking-tighter">NIP. {user.nip || '...................'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 relative theme-dpl">
      {message && (<div className={`fixed top-24 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}><CheckCircle2 size={20}/><span className="text-sm font-black uppercase tracking-tight">{message.text}</span></div>)}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Hapus RPM</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">Hapus baris RPM dari database cloud?</p>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-100">BATAL</button>
              <button onClick={executeDelete} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 shadow-lg">YA, HAPUS</button>
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-7xl max-h-[95vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3"><div className="p-2 bg-indigo-500 rounded-xl shadow-lg"><Rocket size={20}/></div><div><h3 className="font-black uppercase text-sm tracking-widest leading-none">Editor RPM Integrasi Deep Learning</h3><p className="text-[10px] text-slate-400 font-bold tracking-tighter mt-1 uppercase">Struktur: Memahami, Mengaplikasi, Merefleksi (Mindful, Meaningful, Joyful)</p></div></div>
               <div className="flex gap-2"><button onClick={() => setIsPrintMode(true)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl text-[10px] font-black flex items-center gap-2 transition-all"><Printer size={14}/> PRATINJAU</button><button onClick={() => setIsEditing(null)} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-2xl text-[10px] font-black transition-all">TUTUP</button></div>
            </div>
            <div className="p-8 overflow-y-auto space-y-10 no-scrollbar bg-white">
              {isLoadingAI && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex flex-col items-center justify-center gap-6 animate-in fade-in">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" size={32} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Merancang Pembelajaran Mendalam</h3>
                    <p className="text-slate-500 font-medium max-w-xs leading-relaxed italic">
                      {`Mengintegrasikan unsur Berkesadaran, Bermakna, dan Menggembirakan pada setiap langkah materi "${currentRpm?.materi || 'Bab ini'}"...`}
                    </p>
                  </div>
                </div>
              )}

              {currentRpm ? (
                <>
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2"><div className="w-1.5 h-6 bg-blue-600 rounded-full"></div><h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">1. Identitas & Materi Pokok</h4></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="md:col-span-2 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                              <BookOpen className="absolute -right-2 -bottom-2 text-blue-100 opacity-50" size={64}/>
                              <label className="block text-[10px] font-black text-blue-400 uppercase mb-2 tracking-widest ml-1">Materi Utama / Topik</label>
                              <input className="w-full bg-transparent border-none p-0 text-sm font-black text-blue-900 uppercase focus:ring-0 placeholder:text-blue-200" placeholder="Contoh: Ekosistem Sawah" value={currentRpm?.materi} onChange={e => updateRPM(isEditing!, 'materi', e.target.value)} />
                           </div>
                           <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 shadow-sm">
                              <label className="block text-[10px] font-black text-indigo-400 uppercase mb-2 tracking-widest ml-1">Jumlah Pertemuan</label>
                              <div className="flex items-center gap-3">
                                <Split size={18} className="text-indigo-400" />
                                <input type="number" min="1" className="bg-transparent border-none p-0 text-sm font-black text-indigo-900 focus:ring-0 w-full" value={currentRpm?.jumlahPertemuan || 1} onChange={e => updateRPM(isEditing!, 'jumlahPertemuan', parseInt(e.target.value) || 1)} />
                              </div>
                           </div>
                        </div>
                        
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Tujuan Pembelajaran</label>
                           <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none" value={currentRpm?.atpId} onChange={e => syncWithATP(isEditing!, e.target.value)}><option value="">-- PILIH TP DARI ATP --</option>{sortedAtpOptions.map(a => (<option key={a.id} value={a.id}>{a.tujuanPembelajaran}</option>))}</select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 flex justify-between items-center"><span className="flex items-center gap-1"><PencilLine size={10}/> Model Pembelajaran</span><button onClick={() => handleRecommendPedagogy(isEditing!)} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-all"><Wand2 size={10}/><span className="text-[8px] font-black uppercase">REKOMENDASI AI</span></button></label><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black text-slate-700 outline-none" value={currentRpm?.praktikPedagogis || ''} onChange={e => updateRPM(isEditing!, 'praktikPedagogis', e.target.value)} /></div>
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Alokasi Waktu</label><div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-1"><span className="text-xs font-black text-slate-800">{currentRpm?.alokasiWaktu || '0'} JP Total</span><span className="text-[10px] font-bold text-blue-600">Terdistribusi ke {currentRpm?.jumlahPertemuan || 1} sesi</span></div></div>
                        </div>
                      </div>
                      <div className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-200 shadow-inner">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest ml-1">Dimensi Profil (DPL)</label>
                        <div className="grid grid-cols-1 gap-y-3">
                          {DIMENSI_PROFIL.map((dimensi, idx) => {
                            const currentDimensi = currentRpm?.dimensiProfil || [];
                            const isChecked = currentDimensi.includes(dimensi);
                            return (
                              <label key={dimensi} className="flex items-start gap-2 cursor-pointer group">
                                <input type="checkbox" className="hidden" checked={isChecked} onChange={() => {const newDimensi = isChecked ? currentDimensi.filter(d => d !== dimensi) : [...currentDimensi, dimensi]; updateRPM(isEditing!, 'dimensiProfil', newDimensi);}} />
                                <div className={`mt-0.5 transition-all p-0.5 rounded border ${isChecked ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>{isChecked ? <CheckCircle2 size={14} className="text-white" /> : <div className="w-3.5 h-3.5" />}</div>
                                <div className="flex flex-col">
                                  <span className={`text-[8px] font-black uppercase ${isChecked ? 'text-blue-600' : 'text-slate-300'}`}>DPL {idx + 1}</span>
                                  <span className={`text-[10px] font-bold leading-tight ${isChecked ? 'text-slate-900' : 'text-slate-400'}`}>{dimensi}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                       <div className="flex items-center gap-2"><div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div><h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">2. Langkah Pembelajaran (Integrasi Mindful, Meaningful, Joyful)</h4></div>
                       <button onClick={() => handleGenerateAI(isEditing!)} disabled={isLoadingAI} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-95">
                        {isLoadingAI ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16}/>} RANCANG INTEGRASI (AI)
                       </button>
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                       <div className="space-y-3 p-6 bg-indigo-50/20 border border-indigo-100 rounded-[2.5rem]">
                          <label className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1"><Zap size={14}/> Memahami (Koneksi & Pembukaan)</label>
                          <textarea className="w-full bg-white border border-indigo-100 rounded-2xl p-6 text-xs min-h-[150px] leading-relaxed shadow-sm focus:ring-2 focus:ring-indigo-400 outline-none" value={currentRpm?.kegiatanAwal || ''} onChange={e => updateRPM(isEditing!, 'kegiatanAwal', e.target.value)} placeholder="Pertemuan 1: ..." />
                       </div>
                       <div className="space-y-3 p-6 bg-emerald-50/20 border border-emerald-100 rounded-[2.5rem]">
                          <label className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1"><Zap size={14}/> Mengaplikasi (Aksi & Eksplorasi)</label>
                          <textarea className="w-full bg-white border border-emerald-100 rounded-2xl p-6 text-xs min-h-[300px] leading-relaxed shadow-sm focus:ring-2 focus:ring-emerald-400 outline-none" value={currentRpm?.kegiatanInti || ''} onChange={e => updateRPM(isEditing!, 'kegiatanInti', e.target.value)} placeholder="Pertemuan 1: ..." />
                       </div>
                       <div className="space-y-3 p-6 bg-rose-50/20 border border-rose-100 rounded-[2.5rem]">
                          <label className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest ml-1"><Zap size={14}/> Merefleksi (Perayaan & Evaluasi)</label>
                          <textarea className="w-full bg-white border border-rose-100 rounded-2xl p-6 text-xs min-h-[150px] leading-relaxed shadow-sm focus:ring-2 focus:ring-rose-400 outline-none" value={currentRpm?.kegiatanPenutup || ''} onChange={e => updateRPM(isEditing!, 'kegiatanPenutup', e.target.value)} placeholder="Pertemuan 1: ..." />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                       <div className="flex items-center gap-2"><div className="w-1.5 h-6 bg-rose-600 rounded-full"></div><h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">3. Strategi Asesmen & Rubrik</h4></div>
                       <button onClick={() => handleGenerateAsesmenAI(isEditing!)} disabled={isLoadingAsesmenAI} className="bg-rose-600 text-white px-6 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 disabled:opacity-50">
                        {isLoadingAsesmenAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14}/>} SUSUN 3 RUBRIK (AI)
                       </button>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-200">
                       {currentRpm?.asesmenTeknik ? (
                          <div className="space-y-8">
                             {renderAsesmenTable(parseAsesmen(currentRpm.asesmenTeknik) || [])}
                             <textarea className="w-full bg-white border border-slate-200 rounded-xl p-4 text-[10px] font-mono mt-4" value={currentRpm.asesmenTeknik} onChange={e => updateRPM(isEditing!, 'asesmenTeknik', e.target.value)} rows={5} placeholder="JSON Rubrik..." />
                          </div>
                       ) : (
                          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada rubrik asesmen. Klik tombol AI di atas.</p>
                          </div>
                       )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest">Memuat data editor...</div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
               <button onClick={() => setIsEditing(null)} className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl">SIMPAN & SELESAI</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button onClick={() => setFilterSemester('1')} className={`px-8 py-2 rounded-xl text-xs font-black transition-all ${filterSemester === '1' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>SEMESTER 1</button>
          <button onClick={() => setFilterSemester('2')} className={`px-8 py-2 rounded-xl text-xs font-black transition-all ${filterSemester === '2' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>SEMESTER 2</button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none w-64" value={filterMapel} onChange={e => setFilterMapel(e.target.value)}>
            {MATA_PELAJARAN.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={handleAddRPM} className="bg-cyan-600 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-cyan-700 shadow-xl shadow-cyan-100 transition-all"><Plus size={18} /> BUAT RPM BARU</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-40 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 size={48} className="animate-spin text-cyan-600" />
            <p className="font-black text-xs uppercase tracking-widest">Sinkronisasi Cloud...</p>
          </div>
        ) : sortedRPM.length === 0 ? (
          <div className="col-span-full py-40 text-center bg-white border-2 border-dashed border-slate-200 rounded-[48px] text-slate-400 font-black uppercase tracking-widest">Data RPM Kosong</div>
        ) : (
          sortedRPM.map((rpm) => (
            <div key={rpm.id} className="bg-white p-8 rounded-[40px] border border-slate-200 hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-cyan-600 group-hover:scale-110 transition-transform">
                <Rocket size={80} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-cyan-100 text-cyan-600 rounded-2xl flex items-center justify-center font-black text-lg">
                    <Rocket size={20} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-sm font-black text-slate-900 uppercase truncate" title={rpm.materi}>{rpm.materi || 'Materi Belum Diisi'}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{rpm.mataPelajaran}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic leading-relaxed line-clamp-3 mb-6">"{rpm.tujuanPembelajaran}"</p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 p-3 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Durasi</p><p className="text-xs font-black text-slate-800">{rpm.alokasiWaktu} JP</p></div>
                  <div className="flex-1 p-3 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Sesi</p><p className="text-xs font-black text-slate-800">{rpm.jumlahPertemuan || 1} Sesi</p></div>
                </div>
              </div>
              <div className="flex gap-2 pt-6 border-t border-slate-50">
                <button onClick={() => setIsEditing(rpm.id)} className="flex-1 bg-slate-900 text-white py-3.5 rounded-2xl text-[10px] font-black hover:bg-black transition-all uppercase tracking-widest">EDIT & CETAK</button>
                <button onClick={() => setDeleteConfirmId(rpm.id)} className="p-3.5 text-slate-300 hover:text-red-600 transition-all"><Trash2 size={20}/></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RPMManager;
