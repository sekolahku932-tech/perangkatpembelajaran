import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Fase, Kelas, Siswa, AsesmenNilai, AsesmenInstrumen, ATPItem, MATA_PELAJARAN, SchoolSettings, User, KisiKisiItem } from '../types';
import { 
  Plus, Trash2, Loader2, Cloud, Printer, CheckCircle2, AlertTriangle, 
  PenTool, BarChart3, Wand2, ChevronRight, FileDown, Sparkles, Lock, Eye, EyeOff, AlertCircle, X, BookText, Square, CheckSquare, Circle, Maximize2
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
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);

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
    ).sort((a, b) => (a.nomorSoal || 0) - (b.nomorSoal || 0));
  }, [kisikisi, fase, kelas, semester, mapel, namaAsesmen]);

  const availableMapel = user.role === 'admin' ? MATA_PELAJARAN : user.mapelDiampu;
  const isClassLocked = user.role === 'guru' && user.teacherType === 'kelas';

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
        indikatorSoal: '', jenis: 'Tes', bentukSoal: 'Pilihan Ganda', stimulus: '', soal: '', kunciJawaban: '', nomorSoal: nextNo
      });
      if (customName) setNamaAsesmen(nameToUse);
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
    if (!item.tujuanPembelajaran) {
        alert("Pilih Tujuan Pembelajaran (TP) terlebih dahulu!");
        return;
    }
    setAiLoadingMap(prev => ({ ...prev, [`ind-${item.id}`]: true }));
    try {
      // Fix: Removed apiKey argument to comply with process.env.API_KEY guideline
      const indikator = await generateIndikatorSoal(item);
      if (indikator) {
          await updateKisiKisi(item.id, 'indikatorSoal', indikator);
      }
    } catch (e: any) {
      console.error(e);
      alert("Gagal memanggil AI: " + (e.message || "Cek kuota API"));
    } finally { 
      setAiLoadingMap(prev => ({ ...prev, [`ind-${item.id}`]: false })); 
    }
  };

  const generateSoalAI = async (item: KisiKisiItem) => {
    if (!item.indikatorSoal) {
        alert("Buat Indikator Soal terlebih dahulu!");
        return;
    }
    setAiLoadingMap(prev => ({ ...prev, [`soal-${item.id}`]: true }));
    try {
      // Fix: Removed apiKey argument to comply with process.env.API_KEY guideline
      const result = await generateButirSoal(item);
      if (result) {
        await updateDoc(doc(db, "kisikisi", item.id), { 
          stimulus: result.stimulus || "",
          soal: result.soal || "", 
          kunciJawaban: result.kunci || "" 
        });
      }
    } catch (e: any) {
      console.error(e);
      alert("Gagal memanggil AI: " + (e.message || "Cek kuota API"));
    } finally { 
      setAiLoadingMap(prev => ({ ...prev, [`soal-${item.id}`]: false })); 
    }
  };

  const isActionHeader = (h: string) => {
    const normal = h.toLowerCase().trim();
    return ['benar', 'salah', 'setuju', 'tidak setuju', 'ya', 'tidak', 'true', 'false', 'yes', 'no'].includes(normal);
  };

  const renderMatchingLayout = (rows: string[][], isPrint: boolean) => {
    return (
      <div className={`flex justify-between items-stretch gap-8 md:gap-16 my-8 max-w-4xl`}>
        {/* Kolom Kiri (Pernyataan) */}
        <div className="flex flex-col gap-4 flex-1">
          {rows.slice(1).map((row, i) => (
            <div key={`left-${i}`} className="flex items-center gap-3 h-full">
              <div className={`flex-1 border-2 border-black p-3 bg-white font-bold text-center uppercase tracking-tight shadow-sm rounded-sm ${isPrint ? 'text-[9.5px] min-h-[45px]' : 'text-[11.5px] min-h-[55px]'} flex items-center justify-center leading-tight`}>
                {row[0]}
              </div>
              <div className="w-2.5 h-2.5 bg-black rounded-full shrink-0"></div>
            </div>
          ))}
        </div>

        {/* Kolom Kanan (Jawaban) */}
        <div className="flex flex-col gap-4 flex-1">
          {rows.slice(1).map((row, i) => (
            <div key={`right-${i}`} className="flex items-center gap-3 h-full">
              <div className="w-2.5 h-2.5 bg-black rounded-full shrink-0"></div>
              <div className={`flex-1 border-2 border-black p-3 bg-white font-bold text-center uppercase tracking-tight shadow-sm rounded-sm ${isPrint ? 'text-[9.5px] min-h-[45px]' : 'text-[11.5px] min-h-[55px]'} flex items-center justify-center leading-tight`}>
                {row[1] || '...'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSoalContent = (content: string, bentukSoal: string = 'Pilihan Ganda', isPrint = false, isStimulus = false) => {
    if (!content) return null;
    
    const isComplex = bentukSoal.includes('Kompleks') || bentukSoal.includes('Multiple Choice');
    const isMatching = bentukSoal.includes('Menjodohkan');

    let preprocessedContent = content
      .replace(/CHECKBOX_PLACEHOLDER/g, '')
      .replace(/\s+([B-E][\.\)])/g, '\n$1')
      .replace(/\s+(\[\s?\])/g, '\n$1')
      .replace(/([?\.!])\s+(A[\.\)])/g, '$1\n$2')
      .replace(/([?\.!])\s+(\[\s?\])/g, '$1\n$2');

    if (bentukSoal === 'Isian' && !isStimulus && !preprocessedContent.includes('....')) {
       preprocessedContent = preprocessedContent.trim().replace(/\.*$/, '') + ' ....................................';
    }

    const lines = preprocessedContent.split('\n');
    const renderedParts: React.ReactNode[] = [];
    let currentTableRows: string[][] = [];
    let currentParagraphLines: string[] = [];
    const containsArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

    const flushParagraph = (key: string) => {
      if (currentParagraphLines.length > 0) {
        renderedParts.push(
          <div key={key} className={`whitespace-pre-wrap text-justify leading-relaxed ${bentukSoal === 'Isian' ? (isPrint ? 'mb-8' : 'mb-6') : 'mb-3'}`}>
            {currentParagraphLines.map((line, li) => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return null;
              const isArabic = containsArabic(trimmedLine);
              const hasBoxPrefix = /^\[\s?\]|^\[x\]|^\[v\]/i.test(trimmedLine);
              let cleanText = trimmedLine.replace(/^\[\s?\]|^\[x\]|^\[v\]/i, '').trim();
              const optionMatch = cleanText.match(/^([A-E])[\.\)]\s+(.*)/);

              // Logika Kotak Perintah untuk Multiple Choice
              const isInstruction = isComplex && (
                trimmedLine.toLowerCase().includes('tanda centang') || 
                trimmedLine.toLowerCase().includes('pernyataan yang benar') ||
                trimmedLine.toLowerCase().includes('pilihlah jawaban')
              );

              if (isInstruction) {
                return (
                  <div key={li} className={`border-2 border-black p-3 mb-5 bg-slate-50 font-bold ${isPrint ? 'text-[11px]' : 'text-[13px]'} leading-tight rounded-sm shadow-sm flex items-center gap-3`}>
                    <div className="bg-black text-white p-1 rounded-sm shrink-0 shadow-sm"><CheckSquare size={isPrint ? 12 : 15} /></div>
                    <span className="flex-1">{cleanText}</span>
                  </div>
                );
              }

              if (optionMatch) {
                const [_, label, text] = optionMatch;
                if (isComplex) {
                   return (
                     <div key={li} className="flex items-start gap-3 mb-2 pl-1">
                       <Square size={isPrint ? 10 : 13} className="mt-1 text-slate-800 shrink-0" />
                       <span className={`flex-1 ${isPrint ? 'text-[12px]' : 'text-[13px]'} leading-tight`}>{text}</span>
                     </div>
                   );
                } else {
                   return (
                     <div key={li} className="flex items-start gap-3 mb-2 pl-1">
                       <span className={`font-black w-6 shrink-0 text-left ${isPrint ? 'text-[12px]' : 'text-[13px]'}`}>{label}.</span>
                       <span className={`flex-1 ${isPrint ? 'text-[12px]' : 'text-[13px]'} leading-tight`}>{text}</span>
                     </div>
                   );
                }
              }

              if (isComplex && (hasBoxPrefix || currentParagraphLines.length > 1)) {
                const cleanTextNoLabel = cleanText.replace(/^[A-E][\.\)]\s*/, '').trim();
                return (
                  <div key={li} className="flex items-start gap-3 mb-2 pl-1">
                    <Square size={isPrint ? 10 : 13} className="mt-1 text-slate-800 shrink-0" />
                    <span className={`flex-1 ${isPrint ? 'text-[12px]' : 'text-[13px]'} leading-relaxed`}>{cleanTextNoLabel}</span>
                  </div>
                );
              }

              return (
                <div key={li} dir={isArabic ? 'rtl' : 'ltr'} className={`${isArabic ? 'text-right font-serif text-2xl leading-loose my-4' : ''} flex items-start gap-2 mb-1.5`}>
                  <span className={`${isPrint ? 'text-[13px]' : 'text-[14px]'} leading-relaxed`}>{cleanText}</span>
                </div>
              );
            })}
          </div>
        );
        currentParagraphLines = [];
      }
    };

    const flushTable = (key: string) => {
      if (currentTableRows.length > 0) {
        const rows = [...currentTableRows];
        const headers = rows[0];
        
        // Khusus untuk soal Menjodohkan (2 Kolom)
        if (isMatching && rows.length > 1 && headers.length === 2) {
          renderedParts.push(<div key={key}>{renderMatchingLayout(rows, isPrint)}</div>);
          currentTableRows = [];
          return;
        }

        // Cek apakah tabel berisi kolom pilihan (Benar, Salah, Ya, Tidak, dll)
        const isActionTable = headers.some(h => isActionHeader(h));
        const isMatching3Col = headers.length === 3 && (headers[1] === "" || headers[1].includes('.') || headers[1].includes('-'));
        
        renderedParts.push(
          <div key={key} className="overflow-x-auto my-6">
            <table className={`border-collapse border-2 border-black w-full shadow-sm ${isPrint ? 'text-[9.5px]' : 'text-[11.5px]'}`}>
              <thead>
                <tr className="bg-slate-100">
                  {headers.map((cell, i) => {
                    const isCheckHdr = isActionHeader(cell);
                    return (
                      <th key={i} className={`border-2 border-black p-2 font-black text-center uppercase tracking-tight ${isCheckHdr ? (isPrint ? 'w-20' : 'w-28') : ''}`}>
                        {cell}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr key={ri} className="hover:bg-slate-50 transition-colors">
                    {headers.map((_, ci) => {
                      const cell = row[ci] || "";
                      const isCheckCol = isActionHeader(headers[ci] || "");
                      const isCenterCol = isMatching3Col && ci === 1;
                      const isArabic = containsArabic(cell);
                      
                      return (
                        <td key={ci} dir={isArabic ? 'rtl' : 'ltr'} className={`border-2 border-black p-3 ${ci === 0 && row.length > 1 && !isMatching3Col ? 'bg-slate-50/30 font-bold' : ''} ${isCheckCol || isCenterCol ? 'text-center' : 'text-justify'} ${isArabic ? 'text-3xl font-serif leading-loose py-6' : ''}`}>
                          {isCheckCol ? (
                            <div className={`border-2 border-black mx-auto flex items-center justify-center rounded-sm ${isPrint ? 'w-5 h-5' : 'w-6 h-6'}`}>
                              {cell.toLowerCase().includes('v') || cell.toLowerCase().includes('x') || cell.toLowerCase().includes('check') || cell.toLowerCase().includes('✓') ? <div className="bg-black w-3.5 h-3.5"></div> : null}
                            </div>
                          ) : isCenterCol ? (
                            <div className="flex justify-between items-center px-4">
                              <div className="w-2.5 h-2.5 bg-black rounded-full"></div>
                              <div className="flex-1 border-t-2 border-dashed border-slate-300 mx-2"></div>
                              <div className="w-2.5 h-2.5 bg-black rounded-full"></div>
                            </div>
                          ) : (
                            cell
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        currentTableRows = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const isLikelyTableRow = trimmedLine.includes('|');
      const isSeparator = trimmedLine.includes('|') && (trimmedLine.includes('---') || trimmedLine.includes(':---'));

      if (isSeparator) {
        // Skip markdown separator
      } else if (isLikelyTableRow) {
        // Bersihkan spasi berlebih dan pipa di ujung baris
        const cells = trimmedLine.split('|').map(c => c.trim());
        const filteredCells = (cells[0] === '' && cells[cells.length-1] === '') 
          ? cells.slice(1, -1) 
          : (cells[0] === '') ? cells.slice(1) : (cells[cells.length-1] === '') ? cells.slice(0, -1) : cells;

        if (filteredCells.length > 0) {
          if (currentParagraphLines.length > 0) flushParagraph(`p-${index}`);
          currentTableRows.push(filteredCells);
        }
      } else {
        if (currentTableRows.length > 0) flushTable(`t-${index}`);
        if (trimmedLine.length > 0) { 
          currentParagraphLines.push(line); 
        } else if (currentParagraphLines.length > 0) { 
          flushParagraph(`p-${index}`); 
        }
      }
    });
    flushParagraph('p-final'); flushTable('t-final');
    return renderedParts.length > 0 ? <div>{renderedParts}</div> : null;
  };

  const handlePrintAction = () => {
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
              @media print { .no-print { display: none !important; } body { padding: 0; } }
              table { border-collapse: collapse; }
              .break-inside-avoid { page-break-inside: avoid; }
            </style>
          </head>
          <body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
            <div class="max-w-[21cm] mx-auto bg-white">${content}</div>
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

  const QuestionPreviewModal = () => {
    if (!previewItemId) return null;
    const item = kisikisi.find(k => k.id === previewItemId);
    if (!item) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 my-8">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
             <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-lg"><Eye size={20}/></div>
                <div>
                   <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Pratinjau Butir Soal</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nomor Urut: {item.nomorSoal}</p>
                </div>
             </div>
             <button onClick={() => setPreviewItemId(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><X size={24}/></button>
          </div>
          <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
             {item.stimulus && (
               <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 mb-3 text-indigo-600">
                    <BookText size={16}/>
                    <p className="text-[10px] font-black uppercase tracking-widest">Stimulus / Teks Bacaan</p>
                  </div>
                  <div className="p-8 bg-slate-50 border-2 border-indigo-100 rounded-[2.5rem] relative overflow-hidden italic text-slate-700 shadow-inner">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-600"><BookText size={64}/></div>
                    <div className="relative z-10 text-sm leading-relaxed">{renderSoalContent(item.stimulus, item.bentukSoal, false, true)}</div>
                  </div>
               </div>
             )}

             <div className="animate-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center gap-2 mb-3 text-rose-600">
                  <PenTool size={16}/>
                  <p className="text-[10px] font-black uppercase tracking-widest">Pertanyaan & Opsi</p>
                </div>
                <div className="flex gap-4">
                   <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg shrink-0 shadow-lg">{item.nomorSoal}</div>
                   <div className="flex-1 pt-1.5">
                      <div className="text-slate-900 font-bold text-[15px] leading-relaxed mb-6">
                        {renderSoalContent(item.soal, item.bentukSoal, false, false)}
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center justify-between animate-in slide-in-from-bottom-8 duration-1000">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><CheckCircle2 size={18}/></div>
                   <div>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Kunci Jawaban</p>
                      <p className="text-sm font-black text-emerald-900 uppercase">{item.kunciJawaban || 'Belum diatur'}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bentuk Soal</p>
                   <p className="text-[10px] font-black text-slate-800 uppercase">{item.bentukSoal}</p>
                </div>
             </div>
          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
             <button onClick={() => setPreviewItemId(null)} className="bg-slate-900 text-white px-12 py-3 rounded-2xl text-[11px] font-black shadow-lg">Selesai</button>
          </div>
        </div>
      </div>
    );
  };

  if (isPrintMode) {
    return (
      <div className="bg-white p-12 min-h-screen text-slate-900 font-serif">
        <div className="no-print fixed top-6 right-6 flex gap-3 z-[300]">
          <button onClick={() => setIsPrintMode(false)} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xl hover:bg-black transition-all">
            <EyeOff size={16}/> KEMBALI
          </button>
          <button onClick={handlePrintAction} className="bg-rose-600 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xl hover:bg-rose-700 transition-all">
            <Printer size={16}/> CETAK PDF
          </button>
        </div>
        <div ref={printRef}>
          <KopSoalFormal activeTab={activeTab} />
          {activeTab === 'KISI_KISI' ? (
            <div className="space-y-6">
              <h3 className="text-center font-black uppercase text-sm mb-4">KISI-KISI, BUTIR SOAL, DAN KUNCI JAWABAN</h3>
              <table className="w-full border-collapse border-2 border-black text-[7.5px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border-2 border-black p-2 text-left w-20">ELEMEN / CP</th>
                    <th className="border-2 border-black p-2 text-center w-16">LEVEL</th>
                    <th className="border-2 border-black p-2 text-left w-32">INDIKATOR</th>
                    <th className="border-2 border-black p-2 text-center w-20">BENTUK</th>
                    <th className="border-2 border-black p-2 text-left">TEKS BACAAN & BUTIR SOAL</th>
                    <th className="border-2 border-black p-1 text-center w-10">KUNCI</th>
                    <th className="border-2 border-black p-1 text-center w-8">NO</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKisikisi.map((item) => (
                    <tr key={item.id}>
                      <td className="border-2 border-black p-2 leading-tight uppercase font-black">{item.elemen}</td>
                      <td className="border-2 border-black p-2 text-center leading-tight uppercase font-bold">{item.kompetensi}</td>
                      <td className="border-2 border-black p-2 italic leading-tight">{item.indikatorSoal}</td>
                      <td className="border-2 border-black p-2 text-center leading-tight font-black uppercase">{item.bentukSoal}</td>
                      <td className="border-2 border-black p-2 leading-relaxed">
                         {item.stimulus && (
                           <div className="mb-2 p-2 bg-slate-50 border border-slate-200">
                             {renderSoalContent(item.stimulus, item.bentukSoal, true, true)}
                           </div>
                         )}
                         <div className="font-bold">{renderSoalContent(item.soal, item.bentukSoal, true, false)}</div>
                      </td>
                      <td className="border-2 border-black p-1 text-center font-black bg-slate-100">{item.kunciJawaban}</td>
                      <td className="border-2 border-black p-1 text-center font-bold">{item.nomorSoal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-10 mt-10">
              <p className="font-black text-xs uppercase underline mb-6">PETUNJUK: KERJAKAN SOAL DI BAWAH INI DENGAN TELITI DAN JUJUR!</p>
              <table className="w-full border-none">
                <tbody>
                  {filteredKisikisi.map((item) => (
                    <tr key={item.id} className="break-inside-avoid">
                      <td className="w-10 pt-1 align-top font-black text-[16px]">{item.nomorSoal}.</td>
                      <td className="pb-12 align-top">
                         {item.stimulus && (
                           <div className="mb-6">
                              <p className="font-bold text-[11px] italic text-slate-700 mb-2 tracking-tight">Cermatilah teks atau bacaan berikut untuk menjawab soal nomor {item.nomorSoal}!</p>
                              <div className="p-6 border-[1.5px] border-black bg-slate-50 italic text-[12.5px] leading-relaxed shadow-sm">
                                {renderSoalContent(item.stimulus, item.bentukSoal, true, true)}
                              </div>
                           </div>
                         )}
                         <div className="text-[13.5px] leading-relaxed">
                           {renderSoalContent(item.soal, item.bentukSoal, true, false)}
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'KISI_KISI' && (
            <div className="mt-16 flex justify-between items-start text-[10px] px-12 font-sans uppercase font-black tracking-tight break-inside-avoid">
              <div className="text-center w-72"><p>Mengetahui,</p> <p>Kepala Sekolah</p> <div className="h-24"></div> <p className="border-b border-black inline-block min-w-[200px]">{settings.principalName}</p> <p className="no-underline mt-1 font-normal">NIP. {settings.principalNip}</p></div>
              <div className="text-center w-72"><p>Bilato, .........................</p> <p>Guru Kelas/Mapel</p> <div className="h-24"></div> <p className="border-b border-black inline-block min-w-[200px]">{user?.name || '[Nama Guru]'}</p> <p className="no-underline mt-1 font-normal">NIP. {user?.nip || '...................'}</p></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <QuestionPreviewModal />

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
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black uppercase focus:ring-2 focus:ring-rose-600 outline-none" value={modalInputValue} onChange={e => setModalInputValue(e.target.value)} placeholder="CONTOH: SUMATIF TENGAH SEMESTER" autoFocus />
                </div>
                <button onClick={handleCreateNewAsesmen} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-rose-100 transition-all flex items-center justify-center gap-2 mt-4 uppercase text-xs"><Plus size={18}/> BUAT SEKARANG</button>
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
              <button onClick={() => setActiveTab('KISI_KISI')} className={`px-5 py-2 rounded-xl text-[10px] font-black ${activeTab === 'KISI_KISI' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>KISI-KISI</button>
              <button onClick={() => setActiveTab('SOAL')} className={`px-5 py-2 rounded-xl text-[10px] font-black ${activeTab === 'SOAL' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>NASKAH SOAL</button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddAsesmenModal(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg hover:bg-indigo-700"><Plus size={16}/> BUAT BARU</button>
            <button onClick={() => setIsPrintMode(true)} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg hover:bg-black"><Printer size={16}/> PRATINJAU</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6 p-5 bg-slate-50 rounded-2xl">
          <div><label className="text-[10px] font-black text-slate-400 block mb-1 flex items-center gap-1">FASE {isClassLocked && <Lock size={8} className="text-amber-500" />}</label><select disabled={isClassLocked} className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400" value={fase} onChange={e => setFase(e.target.value as Fase)}>{Object.values(Fase).map(f => <option key={f}>{f}</option>)}</select></div>
          <div><label className="text-[10px] font-black text-slate-400 block mb-1 flex items-center gap-1">KELAS {isClassLocked && <Lock size={8} className="text-amber-500" />}</label><select disabled={isClassLocked} className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400" value={kelas} onChange={e => setKelas(e.target.value as Kelas)}>{fase === Fase.A && <><option value="1">1</option><option value="2">2</option></>}{fase === Fase.B && <><option value="3">3</option><option value="4">4</option></>} {fase === Fase.C && <><option value="5">5</option><option value="6">6</option></>}</select></div>
          <div><label className="text-[10px] font-black text-slate-400 block mb-1">MAPEL</label><select className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold" value={mapel} onChange={e => setMapel(e.target.value)}>{availableMapel.map(m => <option key={m}>{m}</option>)}</select></div>
          <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 block mb-1">ASESMEN</label><select className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold" value={namaAsesmen} onChange={e => setNamaAsesmen(e.target.value)}><option value="">Pilih Asesmen</option>{availableAsesmenNames.map(n => <option key={n}>{n}</option>)}</select></div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4 text-slate-400"><Loader2 size={48} className="animate-spin text-rose-600" /><p className="font-black text-xs uppercase tracking-widest">Sinkronisasi Cloud...</p></div>
        ) : activeTab === 'KISI_KISI' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1800px]">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black h-12 uppercase tracking-widest">
                  <th className="px-6 py-2 w-16 text-center border-r border-white/5">Idx</th>
                  <th className="px-6 py-2 w-48">Elemen & TP</th>
                  <th className="px-6 py-2 w-40 text-center">Level Kognitif</th>
                  <th className="px-6 py-2 w-64 text-center">Bentuk & Sub-Tipe</th>
                  <th className="px-6 py-2 w-72">Indikator Soal (AI)</th>
                  <th className="px-6 py-2 w-[800px]">Konten Soal (Stimulus, Pertanyaan, Preview)</th>
                  <th className="px-6 py-2 w-24 text-center border-l border-white/5">No Soal</th>
                  <th className="px-6 py-2 w-24 text-center">Aksi</th>
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
                    <td className="px-6 py-4">
                      <select className="w-full bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-[10px] font-black text-indigo-700 outline-none" value={item.kompetensi} onChange={e => updateKisiKisi(item.id, 'kompetensi', e.target.value as any)}>
                        <option value="Pengetahuan dan Pemahaman">Pengetahuan dan Pemahaman</option>
                        <option value="Aplikasi">Aplikasi</option>
                        <option value="Penalaran">Penalaran</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 space-y-2">
                      <select className="w-full text-[10px] font-bold p-2 border rounded-xl bg-slate-50 outline-none" value={item.bentukSoal.split(' (')[0]} 
                        onChange={e => {
                          const newBase = e.target.value;
                          if (newBase !== 'Pilihan Ganda Kompleks') {
                             updateKisiKisi(item.id, 'bentukSoal', newBase);
                          } else {
                             updateKisiKisi(item.id, 'bentukSoal', 'Pilihan Ganda Kompleks (Multiple Choice)');
                          }
                        }}>
                        <option>Pilihan Ganda</option>
                        <option>Pilihan Ganda Kompleks</option>
                        <option>Menjodohkan</option>
                        <option>Isian</option>
                        <option>Uraian</option>
                      </select>
                      
                      {item.bentukSoal.startsWith('Pilihan Ganda Kompleks') && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl animate-in zoom-in-95">
                           <label className="block text-[8px] font-black text-rose-600 uppercase mb-1">Sub-Tipe Kompleks:</label>
                           <select 
                            className="w-full bg-white border border-rose-200 rounded-lg p-1.5 text-[10px] font-black text-rose-800 outline-none"
                            value={item.bentukSoal.includes('(') ? item.bentukSoal.split('(')[1].replace(')', '') : 'Multiple Choice'}
                            onChange={e => updateKisiKisi(item.id, 'bentukSoal', `Pilihan Ganda Kompleks (${e.target.value})`)}
                           >
                             <option>Multiple Choice</option>
                             <option>Benar-Salah</option>
                             <option>Setuju-Tidak Setuju</option>
                             <option>Ya-Tidak</option>
                           </select>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 relative group">
                      <textarea className="w-full bg-white border border-slate-200 rounded-xl p-2 text-[10px] font-bold italic leading-relaxed min-h-[100px]" value={item.indikatorSoal} onChange={e => updateKisiKisi(item.id, 'indikatorSoal', e.target.value)} />
                      <button onClick={() => generateIndikatorAI(item)} disabled={aiLoadingMap[`ind-${item.id}`]} className="absolute bottom-6 right-8 text-indigo-600 bg-white p-1 rounded shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
                        {aiLoadingMap[`ind-${item.id}`] ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14}/>}
                      </button>
                    </td>
                    <td className="px-6 py-4 bg-slate-50/40 relative border-x border-slate-100">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-4">
                             <div>
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-600 uppercase mb-2">
                                  <BookText size={12}/> Stimulus / Tabel
                                </div>
                                <textarea className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-[10px] font-medium min-h-[120px] focus:ring-2 focus:ring-indigo-500 outline-none" value={item.stimulus} placeholder="Ketik Markdown | tabel | di sini..." onChange={e => updateKisiKisi(item.id, 'stimulus', e.target.value)} />
                             </div>
                             <div>
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-rose-600 uppercase mb-2">
                                  <PenTool size={12}/> Pertanyaan / Opsi
                                </div>
                                <textarea className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-[10px] font-bold min-h-[100px] focus:ring-2 focus:ring-rose-500 outline-none" value={item.soal} placeholder="Ketik butir soal..." onChange={e => updateKisiKisi(item.id, 'soal', e.target.value)} />
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-slate-400">Kunci:</span>
                                <input className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-[10px] font-black text-indigo-600" value={item.kunciJawaban} onChange={e => updateKisiKisi(item.id, 'kunciJawaban', e.target.value)} placeholder="Kunci..." />
                             </div>
                          </div>
                          <div className="flex flex-col h-full">
                             <div className="bg-slate-900 text-white px-3 py-1.5 rounded-t-xl text-[8px] font-black uppercase tracking-widest flex items-center justify-between">
                                <span>Live Preview</span>
                                <Sparkles size={10} className="text-emerald-400 animate-pulse"/>
                             </div>
                             <div className="flex-1 bg-white border-2 border-slate-900 border-t-0 p-4 rounded-b-xl overflow-y-auto max-h-[350px] shadow-inner custom-scrollbar text-[11px]">
                                {item.stimulus && (
                                   <div className="mb-4 pb-4 border-b border-slate-100 italic text-slate-700">
                                      {renderSoalContent(item.stimulus, item.bentukSoal, false, true)}
                                   </div>
                                )}
                                <div className="font-bold text-slate-900">
                                   {renderSoalContent(item.soal, item.bentukSoal, false, false)}
                                </div>
                             </div>
                          </div>
                       </div>
                       <button onClick={() => generateSoalAI(item)} disabled={aiLoadingMap[`soal-${item.id}`]} className="absolute bottom-4 right-4 bg-rose-600 text-white p-2.5 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all z-10">
                         {aiLoadingMap[`soal-${item.id}`] ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18}/>}
                       </button>
                    </td>
                    <td className="px-6 py-4 text-center border-l border-slate-50 bg-slate-50/30"><input type="number" className="w-16 text-[12px] text-center font-black p-2 border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-600" value={item.nomorSoal} onChange={e => updateKisiKisi(item.id, 'nomorSoal', parseInt(e.target.value) || 0)} /></td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex flex-col gap-2">
                          <button onClick={() => setPreviewItemId(item.id)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all" title="Pratinjau Soal">
                            <Eye size={16}/>
                          </button>
                          <button onClick={() => deleteDoc(doc(db, "kisikisi", item.id))} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Hapus Baris">
                            <Trash2 size={16}/>
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
                <tr><td colSpan={8} className="p-4"><button onClick={() => handleAddKisikisiRow()} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-black text-slate-400 hover:border-rose-300 hover:text-rose-500 transition-all">+ TAMBAH BARIS ASESMEN</button></td></tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 bg-slate-50 min-h-[600px]">
             <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-2 gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-12">
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Hari / Tanggal Pelaksanaan</label><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold" value={hariTanggal} onChange={e => setHariTanggal(e.target.value)} placeholder="Contoh: Senin, 12 Juni 2024" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Alokasi Waktu</label><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold" value={waktuPengerjaan} onChange={e => setWaktuPengerjaan(e.target.value)} placeholder="Contoh: 90 Menit" /></div>
                </div>
                <div className="space-y-1 bg-white p-1 rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                   <table className="w-full border-collapse">
                      <thead><tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest h-10"><th className="w-16 px-4 text-center">No</th><th className="px-6 text-left">Naskah Soal & Bacaan</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredKisikisi.map((item) => (
                           <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors align-top">
                              <td className="py-8 px-4 align-top text-center"><span className="inline-flex items-center justify-center w-10 h-10 bg-slate-100 text-slate-900 rounded-xl font-black text-lg shadow-sm border border-slate-200 group-hover:bg-rose-600 group-hover:text-white transition-all">{item.nomorSoal}</span></td>
                              <td className="py-8 px-6 align-top">
                                 <div className="space-y-6">
                                    {item.stimulus && (
                                      <div><p className="font-bold text-[11px] italic text-slate-600 mb-2">Cermatilah teks atau bacaan berikut untuk menjawab soal nomor {item.nomorSoal}:</p><div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-indigo-100 shadow-sm relative overflow-hidden mb-6"><div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-600"><BookText size={64}/></div><div className="text-sm leading-relaxed text-slate-700 italic">{renderSoalContent(item.stimulus, item.bentukSoal, false, true)}</div></div></div>
                                    )}
                                    <div className="text-slate-800 text-sm leading-relaxed pr-10">{renderSoalContent(item.soal, item.bentukSoal, false, false)}</div>
                                 </div>
                              </td>
                           </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AsesmenManager;