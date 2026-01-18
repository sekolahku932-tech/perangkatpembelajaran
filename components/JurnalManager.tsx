
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Kelas, JurnalItem, MATA_PELAJARAN, SchoolSettings, AcademicYear, User, PromesItem, RPMItem } from '../types';
import { 
  Plus, Trash2, Loader2, Cloud, Printer, CheckCircle2, AlertTriangle, 
  Wand2, Search, BookText, FileDown,
  Sparkles, AlertCircle, Info, Lock
} from 'lucide-react';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from '../services/firebase';
import { generateJurnalNarasi } from '../services/geminiService';

interface JurnalManagerProps {
  user: User;
}

const MONTH_MAP: Record<string, number> = {
  'Januari': 0, 'Februari': 1, 'Maret': 2, 'April': 3, 'Mei': 4, 'Juni': 5,
  'Juli': 6, 'Agustus': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11
};

const JurnalManager: React.FC<JurnalManagerProps> = ({ user }) => {
  const [jurnals, setJurnals] = useState<JurnalItem[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [promesData, setPromesData] = useState<PromesItem[]>([]);
  const [rpmData, setRpmData] = useState<RPMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeYear, setActiveYear] = useState('');
  const [selectedKelas, setSelectedKelas] = useState<Kelas>('1');
  
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: 'SD NEGERI 5 BILATO',
    address: 'Kecamatan Bilato, Kabupaten Gorontalo',
    principalName: 'Nama Kepala Sekolah',
    principalNip: '-'
  });

  const printRef = useRef<HTMLDivElement>(null);

  // Kunci akses kelas jika user adalah guru kelas
  const isClassLocked = user.role === 'guru' && (user.teacherType === 'kelas' || (!user.teacherType && user.kelas !== '-' && user.kelas !== 'Multikelas'));

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (user.role === 'guru') {
      if (user.kelas !== '-' && user.kelas !== 'Multikelas') {
        setSelectedKelas(user.kelas as Kelas);
      }
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const unsubSettings = onSnapshot(doc(db, "settings", "school_info"), (snap) => {
      if (snap.exists()) setSettings(snap.data() as SchoolSettings);
    });

    const unsubYears = onSnapshot(collection(db, "academic_years"), (snap) => {
      const yearList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AcademicYear[];
      setYears(yearList);
      const active = yearList.find(y => y.isActive);
      if (active) setActiveYear(active.year);
      else if (yearList.length > 0) setActiveYear(yearList[0].year);
    });

    const unsubJurnal = onSnapshot(collection(db, "jurnal_harian"), (snapshot) => {
      setJurnals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JurnalItem[]);
      setLoading(false);
    });

    const unsubPromes = onSnapshot(collection(db, "promes"), (snapshot) => {
      setPromesData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PromesItem[]);
    });

    const unsubRpm = onSnapshot(collection(db, "rpm"), (snapshot) => {
      setRpmData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RPMItem[]);
    });

    return () => { unsubSettings(); unsubYears(); unsubJurnal(); unsubPromes(); unsubRpm(); };
  }, []);

  const filteredJurnals = useMemo(() => {
    return jurnals
      .filter(j => j.tahunPelajaran === activeYear && j.kelas === selectedKelas)
      .sort((a, b) => {
        const dateA = new Date(a.tanggal).getTime();
        const dateB = new Date(b.tanggal).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.mataPelajaran.localeCompare(b.mataPelajaran);
      });
  }, [jurnals, activeYear, selectedKelas]);

  const handleSyncFromPromes = async () => {
    if (!activeYear || !selectedKelas) {
      setMessage({ text: 'Tahun Pelajaran atau Kelas belum dipilih.', type: 'error' });
      return;
    }
    
    setIsSyncing(true);
    
    try {
      const yearParts = activeYear.split('/');
      const yearStart = parseInt(yearParts[0]);
      const yearEnd = parseInt(yearParts[1]) || yearStart + 1;
      
      const normalizedUserMapels = (user.mapelDiampu || []).map(m => m.trim().toLowerCase());

      const relevantPromes = promesData.filter(p => {
        const isMatchKelas = String(p.kelas).trim() === String(selectedKelas).trim();
        const mapelTrimmed = (p.mataPelajaran || '').trim().toLowerCase();
        const isMatchMapel = user.teacherType === 'kelas' ? true : normalizedUserMapels.includes(mapelTrimmed);
        const hasSchedule = p.bulanPelaksanaan && p.bulanPelaksanaan.trim().length > 0;
        return isMatchKelas && isMatchMapel && hasSchedule;
      });

      if (relevantPromes.length === 0) {
        setMessage({ 
          text: `Tidak ditemukan jadwal PROMES untuk Kelas ${selectedKelas} pada Mata Pelajaran Anda. Pastikan PROMES sudah diisi jadwalnya (ceklis kalender).`, 
          type: 'info' 
        });
        setIsSyncing(false);
        return;
      }

      let createdCount = 0;
      
      for (const p of relevantPromes) {
        const datesArray = p.bulanPelaksanaan.split(',').filter(d => d.includes('|')).sort((a, b) => {
            const partA = a.split('|');
            const partB = b.split('|');
            const mA = MONTH_MAP[partA[0].trim()];
            const mB = MONTH_MAP[partB[0].trim()];
            if (mA !== mB) return mA - mB;
            return parseInt(partA[2].trim()) - parseInt(partB[2].trim());
        });

        let meetingIndex = 1;
        for (const dateEntry of datesArray) {
          const parts = dateEntry.split('|');
          if (parts.length < 3) continue;
          
          const monthName = parts[0].trim();
          const day = parseInt(parts[2].trim());
          const monthIndex = MONTH_MAP[monthName];
          if (monthIndex === undefined || isNaN(day)) continue;
          
          const year = monthIndex >= 6 ? yearStart : yearEnd;
          const isoDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          const baseMateri = p.materiPokok + (p.subMateri ? `: ${p.subMateri}` : '');
          const displayMateri = datesArray.length > 1 
            ? `${baseMateri} (Pertemuan ${meetingIndex})` 
            : baseMateri;

          const alreadyExists = jurnals.some(j => 
            j.tanggal === isoDate && 
            j.mataPelajaran.trim().toLowerCase() === p.mataPelajaran.trim().toLowerCase() && 
            j.materi.trim().toLowerCase() === displayMateri.trim().toLowerCase() &&
            j.kelas === selectedKelas
          );

          if (!alreadyExists) {
            const matchingRpm = rpmData.find(r => 
              r.kelas === selectedKelas && 
              r.mataPelajaran.trim().toLowerCase() === p.mataPelajaran.trim().toLowerCase() &&
              (baseMateri.toLowerCase().includes(r.materi.toLowerCase()) || r.materi.toLowerCase().includes(baseMateri.toLowerCase()))
            );

            await addDoc(collection(db, "jurnal_harian"), {
              userId: user.id,
              userName: user.name,
              tahunPelajaran: activeYear,
              kelas: selectedKelas,
              tanggal: isoDate,
              mataPelajaran: p.mataPelajaran,
              materi: displayMateri,
              detailKegiatan: '',
              praktikPedagogis: matchingRpm ? matchingRpm.praktikPedagogis : '',
              absenSiswa: '',
              catatanKejadian: ''
            });
            createdCount++;
          }
          meetingIndex++;
        }
      }
      
      setMessage({ 
        text: createdCount > 0 ? `Berhasil menyinkronkan ${createdCount} entri jurnal baru dari PROMES.` : 'Jurnal harian sudah sinkron dengan jadwal PROMES saat ini.', 
        type: createdCount > 0 ? 'success' : 'info' 
      });
    } catch (e: any) {
      console.error(e);
      setMessage({ text: 'Gagal sinkronisasi: ' + e.message, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddJurnal = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await addDoc(collection(db, "jurnal_harian"), {
        userId: user.id,
        userName: user.name,
        tahunPelajaran: activeYear,
        kelas: selectedKelas,
        tanggal: today,
        mataPelajaran: (user.mapelDiampu && user.mapelDiampu.length > 0) ? user.mapelDiampu[0] : MATA_PELAJARAN[2],
        materi: '',
        detailKegiatan: '',
        praktikPedagogis: '',
        absenSiswa: '',
        catatanKejadian: ''
      });
      setMessage({ text: 'Baris jurnal manual ditambahkan.', type: 'success' });
    } catch (e) { console.error(e); }
  };

  const updateJurnal = async (id: string, field: keyof JurnalItem, value: any) => {
    try {
      await updateDoc(doc(db, "jurnal_harian", id), { [field]: value });
    } catch (e) { console.error(e); }
  };

  const executeDeleteJurnal = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, "jurnal_harian", deleteConfirmId));
      setDeleteConfirmId(null);
      setMessage({ text: 'Jurnal berhasil dihapus.', type: 'success' });
    } catch (e) { setMessage({ text: 'Gagal menghapus.', type: 'error' }); }
  };

  const handleAIJournalAssist = async (id: string) => {
    const item = jurnals.find(j => j.id === id);
    if (!item || !item.materi) {
      setMessage({ text: 'Harap isi Topik/Materi terlebih dahulu.', type: 'warning' });
      return;
    }

    const baseMateri = item.materi.replace(/\(Pertemuan\s*\d+\)/gi, '').toLowerCase().trim();
    const matchingRpm = rpmData.find(r => 
      r.kelas === item.kelas && 
      r.mataPelajaran.trim().toLowerCase() === item.mataPelajaran.trim().toLowerCase() &&
      (baseMateri.includes(r.materi.toLowerCase().trim()) || r.materi.toLowerCase().trim().includes(baseMateri))
    );

    setIsLoadingAI(id);
    try {
      const res = await generateJurnalNarasi(item, matchingRpm, user.apiKey);
      if (res.detail_kegiatan) await updateJurnal(id, 'detailKegiatan', res.detail_kegiatan);
      if (res.pedagogik) await updateJurnal(id, 'praktikPedagogis', res.pedagogik);
      
      setMessage({ 
        text: matchingRpm ? 'AI menyusun narasi berdasarkan RPM Anda.' : 'AI menyusun narasi jurnal umum.', 
        type: 'success' 
      });
    } catch (e: any) {
      console.error(e);
      setMessage({ text: 'AI Gagal: ' + (e.message || 'Cek kuota'), type: 'error' });
    } finally {
      setIsLoadingAI(null);
    }
  };

  const handleExportWord = () => {
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Jurnal Harian Guru</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.4; }
        .kop { text-align: center; border-bottom: 3px solid black; padding-bottom: 10px; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; border: 1.5px solid black; }
        th, td { border: 1px solid black; padding: 6px; font-size: 10pt; vertical-align: top; }
        .text-center { text-align: center; }
        .bg-gray { background-color: #f2f2f2; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
      </style>
      </head><body>
    `;
    const footer = "</body></html>";
    
    let contentHtml = `
      <div class="kop">
        <h2 style="margin:0" class="uppercase">JURNAL HARIAN GURU</h2>
        <h3 style="margin:5px 0" class="uppercase">${settings.schoolName}</h3>
      </div>
      <div style="margin-bottom: 15px;">
        <table style="border:none; width: 100%;">
          <tr style="border:none;">
            <td style="border:none; width: 50%; font-size: 10pt;">
              <b>NAMA GURU:</b> ${user.name}<br/>
              <b>KELAS:</b> ${selectedKelas}
            </td>
            <td style="border:none; width: 50%; font-size: 10pt; text-align: right;">
              <b>TAHUN PELAJARAN:</b> ${activeYear}<br/>
              <b>NIP:</b> ${user.nip}
            </td>
          </tr>
        </table>
      </div>
      <table>
        <thead>
          <tr class="bg-gray">
            <th style="width:30px">NO</th>
            <th style="width:100px">HARI / TANGGAL</th>
            <th style="width:80px">MAPEL</th>
            <th style="width:120px">TOPIK / MATERI</th>
            <th>DETAIL KEGIATAN</th>
            <th style="width:100px">METODE</th>
          </tr>
        </thead>
        <tbody>
          ${filteredJurnals.map((item, idx) => `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td>${getDayName(item.tanggal)}, ${formatDate(item.tanggal)}</td>
              <td class="text-center">${item.mataPelajaran}</td>
              <td class="font-bold uppercase" style="font-size: 8pt;">${item.materi}</td>
              <td style="text-align: justify;">${item.detailKegiatan || '-'}</td>
              <td class="text-center italic">${item.praktikPedagogis || '-'}</td>
            </tr>
          `).join('')}
          ${filteredJurnals.length === 0 ? '<tr><td colspan="6" class="text-center italic">Belum ada data jurnal</td></tr>' : ''}
        </tbody>
      </table>
      <div style="margin-top: 40px;">
        <table style="border:none; width: 100%;">
          <tr style="border:none;">
            <td style="border:none; width: 50%; text-align: center;">
              Mengetahui,<br/>Kepala Sekolah<br/><br/><br/><br/>
              <b>${settings.principalName}</b><br/>
              NIP. ${settings.principalNip}
            </td>
            <td style="border:none; width: 50%; text-align: center;">
              Bilato, .........................<br/>Guru Kelas<br/><br/><br/><br/>
              <b>${user.name}</b><br/>
              NIP. ${user.nip}
            </td>
          </tr>
        </table>
      </div>
    `;

    const blob = new Blob(['\ufeff', header + contentHtml + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JURNAL_GURU_KLS${selectedKelas}_${activeYear.replace('/', '-')}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintInternal = () => {
    const content = printRef.current?.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Jurnal Harian - SDN 5 Bilato</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Inter', sans-serif; background: white; padding: 20px; }
              @media print { 
                .no-print { display: none !important; }
                body { padding: 0; }
              }
              .break-inside-avoid { page-break-inside: avoid; }
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

  const getDayName = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long' }); } catch { return '-'; }
  };

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return '-'; }
  };

  if (isPrintMode) {
    return (
      <div className="bg-white min-h-screen text-slate-900 p-8 font-sans print:p-0">
        <div className="no-print mb-6 flex justify-between bg-slate-100 p-4 rounded-2xl border border-slate-200">
           <div className="flex gap-2">
             <button onClick={() => setIsPrintMode(false)} className="bg-slate-800 text-white px-6 py-2 rounded-xl text-xs font-black">KEMBALI</button>
             <button onClick={handleExportWord} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-sm"><FileDown size={16}/> UNDUH WORD</button>
           </div>
           <button onClick={handlePrintInternal} className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-sm flex items-center gap-2"><Printer size={16}/> CETAK PDF</button>
        </div>

        <div className="no-print bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-8 text-[10px] font-bold text-amber-800 flex items-center gap-3">
          <AlertCircle size={16}/> 
          Jika dialog cetak tidak terbuka, pastikan pop-up di browser Anda tidak terblokir.
        </div>

        <div ref={printRef} className="max-w-[21cm] mx-auto bg-white p-10 border-2 border-black shadow-none flex flex-col font-serif">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-black uppercase border-b-4 border-black pb-2 inline-block">Jurnal Harian Guru</h1>
            <h2 className="text-xl font-bold mt-3 uppercase">{settings.schoolName}</h2>
            <div className="grid grid-cols-2 gap-4 mt-8 text-left text-xs font-bold font-sans uppercase">
               <div className="space-y-2">
                 <div className="flex"><span>Nama Guru</span><span className="ml-8 mr-2">:</span><span>{user.name}</span></div>
                 <div className="flex"><span>Kelas</span><span className="ml-16 mr-2">:</span><span>{selectedKelas}</span></div>
               </div>
               <div className="space-y-2">
                 <div className="flex"><span>Tahun Pelajaran</span><span className="ml-4 mr-2">:</span><span>{activeYear}</span></div>
                 <div className="flex"><span>NIP</span><span className="ml-24 mr-2">:</span><span>{user.nip}</span></div>
               </div>
            </div>
          </div>
          <table className="w-full border-collapse border-[1.5px] border-black text-[10px]">
            <thead>
              <tr className="bg-slate-50 uppercase font-bold text-center">
                <th className="border-[1.5px] border-black p-2 w-8">No</th>
                <th className="border-[1.5px] border-black p-2 w-32">Hari / Tanggal</th>
                <th className="border-[1.5px] border-black p-2 w-24">Mapel</th>
                <th className="border-[1.5px] border-black p-2 w-40">Topik / Materi</th>
                <th className="border-[1.5px] border-black p-2">Detail Kegiatan</th>
                <th className="border-[1.5px] border-black p-2 w-32">Metode / Model</th>
                <th className="border-[1.5px] border-black p-2 w-20">Paraf</th>
              </tr>
            </thead>
            <tbody>
              {filteredJurnals.length > 0 ? (
                filteredJurnals.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="border-[1.5px] border-black p-2 text-center">{idx + 1}</td>
                    <td className="border-[1.5px] border-black p-2">{getDayName(item.tanggal)},<br/>{formatDate(item.tanggal)}</td>
                    <td className="border-[1.5px] border-black p-2 text-center">{item.mataPelajaran}</td>
                    <td className="border-[1.5px] border-black p-2 font-bold uppercase text-[8px]">{item.materi}</td>
                    <td className="border-[1.5px] border-black p-2 text-justify leading-relaxed">{item.detailKegiatan || '-'}</td>
                    <td className="border-[1.5px] border-black p-2 italic text-center">{item.praktikPedagogis || '-'}</td>
                    <td className="border-[1.5px] border-black p-2 text-center py-8"></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="border-[1.5px] border-black p-10 text-center italic">Data Jurnal Kosong</td></tr>
              )}
            </tbody>
          </table>
          <div className="mt-16 grid grid-cols-2 text-center text-xs font-black uppercase font-sans break-inside-avoid">
             <div><p>Mengetahui,</p><p>Kepala Sekolah</p><div className="h-24"></div><p className="border-b border-black inline-block min-w-[180px]">{settings.principalName}</p><p className="mt-1 font-normal">NIP. {settings.principalNip}</p></div>
             <div><p>Bilato, ........................</p><p>Guru Kelas / Mata Pelajaran</p><div className="h-24"></div><p className="border-b border-black inline-block min-w-[180px]">{user.name}</p><p className="mt-1 font-normal">NIP. {user.nip}</p></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 relative">
      {message && (
        <div className={`fixed top-24 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border transition-all animate-in slide-in-from-right ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : message.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
          <span className="text-sm font-black uppercase tracking-tight">{message.text}</span>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Hapus Jurnal</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">Hapus baris jurnal ini dari cloud?</p>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-100">BATAL</button>
              <button onClick={executeDeleteJurnal} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 shadow-lg">YA, HAPUS</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg"><BookText size={24} /></div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Jurnal Harian Guru</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest text-emerald-600">Sinkron RPM & Metode Pembelajaran</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-black outline-none" value={activeYear} onChange={e => setActiveYear(e.target.value)}>
              <option value="">- Tahun Pelajaran -</option>
              {years.map(y => <option key={y.id} value={y.year}>{y.year}</option>)}
            </select>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
               {['1','2','3','4','5','6'].map(k => (
                 <button 
                   key={k} 
                   disabled={isClassLocked && user.kelas !== k}
                   onClick={() => setSelectedKelas(k as Kelas)} 
                   className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${selectedKelas === k ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-not-allowed'}`}
                 >
                   {k}
                 </button>
               ))}
            </div>
            
            <button 
              onClick={handleSyncFromPromes} 
              disabled={isSyncing || !activeYear}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              SINKRON PROMES
            </button>

            <button onClick={handleAddJurnal} className="bg-slate-100 text-slate-900 border border-slate-200 px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-white active:scale-95 transition-all">
              <Plus size={16} /> MANUAL
            </button>
            <button onClick={() => setIsPrintMode(true)} className="bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-black shadow-md"><Printer size={16} /> PRATINJAU</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-black h-12 uppercase tracking-widest">
                <th className="px-6 py-2 w-48 border-r border-white/5">Hari / Tanggal</th>
                <th className="px-6 py-2 w-56 border-r border-white/5">Mata Pelajaran</th>
                <th className="px-6 py-2 w-64 border-r border-white/5">Topik / Materi</th>
                <th className="px-6 py-2 border-r border-white/5">Kegiatan Pembelajaran (Narasi)</th>
                <th className="px-6 py-2 w-64 border-r border-white/5">Model / Metode (Tanpa Uraian)</th>
                <th className="px-6 py-2 w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center"><Loader2 size={32} className="animate-spin inline-block text-emerald-600" /></td></tr>
              ) : filteredJurnals.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-24 text-center text-slate-400 italic font-bold">Belum ada catatan jurnal untuk Kelas {selectedKelas}. Klik "SINKRON DARI PROMES" untuk mengisi otomatis.</td></tr>
              ) : (
                filteredJurnals.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors align-top group">
                    <td className="px-6 py-5 border-r border-slate-100 bg-slate-50/30">
                       <input type="date" className="w-full bg-transparent border-none text-[11px] font-black text-slate-800 focus:ring-0 p-0" value={item.tanggal} onChange={e => updateJurnal(item.id, 'tanggal', e.target.value)} />
                       <div className="text-[9px] font-bold text-emerald-600 uppercase mt-1 tracking-tight">{getDayName(item.tanggal)}</div>
                    </td>
                    <td className="px-6 py-5 border-r border-slate-100">
                       <select className="w-full bg-transparent border-none text-[11px] font-bold focus:ring-0 p-0 text-slate-700" value={item.mataPelajaran} onChange={e => updateJurnal(item.id, 'mataPelajaran', e.target.value)}>
                         {MATA_PELAJARAN.map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                    </td>
                    <td className="px-6 py-5 border-r border-slate-100">
                       <textarea className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-black text-slate-900 resize-none p-0 h-20 scrollbar-none uppercase" value={item.materi} placeholder="Topik materi..." onChange={e => updateJurnal(item.id, 'materi', e.target.value)} />
                    </td>
                    <td className="px-6 py-5 border-r border-slate-100 relative">
                       <textarea className="w-full bg-transparent border-none focus:ring-0 text-[11px] leading-relaxed text-slate-600 resize-none p-0 h-32 scrollbar-none" value={item.detailKegiatan} placeholder="Narasi pembelajaran..." onChange={e => updateJurnal(item.id, 'detailKegiatan', e.target.value)} />
                       <button onClick={() => handleAIJournalAssist(item.id)} disabled={isLoadingAI === item.id} title="Gunakan Asisten AI (Sinkron RPM)" className="absolute bottom-4 right-4 bg-emerald-100 text-emerald-700 p-2 rounded-xl hover:bg-emerald-200 transition-all shadow-sm active:scale-90 disabled:opacity-50">
                         {isLoadingAI === item.id ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                       </button>
                    </td>
                    <td className="px-6 py-5 border-r border-slate-100">
                       <textarea className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold italic text-indigo-600 resize-none p-0 h-20 scrollbar-none" value={item.praktikPedagogis} placeholder="Model/Metode Saja..." onChange={e => updateJurnal(item.id, 'praktikPedagogis', e.target.value)} />
                    </td>
                    <td className="px-6 py-5 text-center">
                       <button onClick={() => setDeleteConfirmId(item.id)} className="p-2 text-slate-300 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                    </td>
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

export default JurnalManager;
