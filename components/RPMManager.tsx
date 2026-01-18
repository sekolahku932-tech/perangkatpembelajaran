import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Fase, Kelas, RPMItem, ATPItem, PromesItem, CapaianPembelajaran, MATA_PELAJARAN, DIMENSI_PROFIL, SchoolSettings, User } from '../types';
// Add Clock, Layout, and Save to lucide-react imports
import { Plus, Trash2, Rocket, Sparkles, Loader2, CheckCircle2, Printer, Cloud, FileText, Split, AlertTriangle, FileDown, Wand2, PencilLine, Lock, Brain, Zap, RefreshCw, PenTool, Search, AlertCircle, X, CheckSquare, Square, Cpu, ClipboardList, BookOpen, Edit2, Globe, Clock, Layout, Save } from 'lucide-react';
import { generateRPMContent, generateAssessmentDetails, recommendPedagogy } from '../services/geminiService';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from '../services/firebase';

interface RPMManagerProps {
  user: User;
}

const RPMManager: React.FC<RPMManagerProps> = ({ user }) => {
  const [rpmList, setRpmList] = useState<RPMItem[]>([]);
  const [atpData, setAtpData] = useState<ATPItem[]>([]);
  const [cps, setCps] = useState<CapaianPembelajaran[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterFase, setFilterFase] = useState<Fase>(Fase.A);
  const [filterKelas, setFilterKelas] = useState<Kelas>('1');
  const [filterSemester, setFilterSemester] = useState<'1' | '2'>('1');
  const [filterMapel, setFilterMapel] = useState<string>(MATA_PELAJARAN[0]);
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: 'SD NEGERI 5 BILATO',
    address: 'Kecamatan Bilato, Kabupaten Gorontalo',
    principalName: 'Nama Kepala Sekolah',
    principalNip: '-'
  });
  
  const [activeYear, setActiveYear] = useState('2025/2026');

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
    const unsubRpm = onSnapshot(collection(db, "rpm"), (snapshot) => {
      setRpmList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RPMItem[]);
    });
    const unsubAtp = onSnapshot(collection(db, "atp"), (snapshot) => {
      setAtpData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ATPItem[]);
    });
    const unsubCps = onSnapshot(collection(db, "cps"), (snapshot) => {
      setCps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CapaianPembelajaran[]);
      setLoading(false);
    });
    return () => { unsubSettings(); unsubYears(); unsubRpm(); unsubAtp(); unsubCps(); };
  }, []);

  const sortedRPM = useMemo(() => {
    const filtered = rpmList.filter(r => r.fase === filterFase && r.kelas === filterKelas && r.semester === filterSemester && r.mataPelajaran === filterMapel);
    return filtered.sort((a, b) => {
      const atpA = atpData.find(atp => atp.tujuanPembelajaran === a.tujuanPembelajaran);
      const atpB = atpData.find(atp => atp.tujuanPembelajaran === b.tujuanPembelajaran);
      return (atpA?.indexOrder || 99) - (atpB?.indexOrder || 99);
    });
  }, [rpmList, atpData, filterFase, filterKelas, filterSemester, filterMapel]);

  const updateRPM = async (id: string, field: keyof RPMItem, value: any) => {
    try { await updateDoc(doc(db, "rpm", id), { [field]: value }); } catch (e) { console.error(e); }
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, "rpm", deleteConfirmId));
      setDeleteConfirmId(null);
      setMessage({ text: 'RPM Berhasil dihapus!', type: 'success' });
    } catch (e) { setMessage({ text: 'Gagal!', type: 'error' }); }
  };

  const renderListContent = (text: string | undefined) => {
    if (!text) return '-';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) return <p className="whitespace-pre-wrap">{text}</p>;
    return (
      <ul className="space-y-1">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-2 items-start">
            <span className="font-bold text-slate-800">{i + 1}.</span>
            <span>{l.replace(/^\d+\.\s*/, '')}</span>
          </li>
        ))}
      </ul>
    );
  };

  const isClassLocked = user.role === 'guru' && user.teacherType === 'kelas';
  const availableMapel = user.role === 'admin' ? MATA_PELAJARAN : (user.mapelDiampu || []);

  const handleCreateRPMFromATP = async (atp: ATPItem) => {
    try {
      await addDoc(collection(db, "rpm"), {
        atpId: atp.id,
        fase: atp.fase,
        kelas: atp.kelas,
        semester: filterSemester,
        mataPelajaran: atp.mataPelajaran,
        tujuanPembelajaran: atp.tujuanPembelajaran,
        materi: atp.materi,
        alokasiWaktu: atp.alokasiWaktu,
        jumlahPertemuan: 1,
        asesmenAwal: atp.asesmenAwal,
        dimensiProfil: atp.dimensiProfilLulusan.split(',').map(s => s.trim()),
        praktikPedagogis: '',
        kemitraan: '',
        lingkunganBelajar: '',
        pemanfaatanDigital: '',
        kegiatanAwal: '',
        kegiatanInti: '',
        kegiatanPenutup: '',
        asesmenTeknik: atp.asesmenProses,
        materiAjar: ''
      });
      setMessage({ text: 'RPM Baru berhasil dibuat!', type: 'success' });
    } catch (e) {
      setMessage({ text: 'Gagal membuat RPM', type: 'error' });
    }
  };

  const handleGenerateAI = async (id: string) => {
    const rpm = rpmList.find(r => r.id === id);
    if (!rpm) return;
    setIsLoadingAI(true);
    try {
      const result = await generateRPMContent(rpm.tujuanPembelajaran, rpm.materi, rpm.kelas, rpm.praktikPedagogis, rpm.alokasiWaktu, rpm.jumlahPertemuan);
      if (result) {
        await updateDoc(doc(db, "rpm", id), { ...result });
        setMessage({ text: 'Konten RPM diperbarui oleh AI!', type: 'success' });
      }
    } catch (err: any) {
      setMessage({ text: 'AI Gagal: ' + (err.message || 'Cek kuota'), type: 'error' });
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {message && (
        <div className={`fixed top-24 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <CheckCircle2 size={20}/><span className="text-sm font-black uppercase">{message.text}</span>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Hapus RPM</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">Hapus rancangan pembelajaran ini?</p>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-slate-500 bg-white border border-slate-200">BATAL</button>
              <button onClick={executeDelete} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-white bg-red-600">YA, HAPUS</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-8">
           <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-600 text-white rounded-2xl shadow-lg"><Rocket size={24} /></div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">RPM (Deep Learning)</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Database Cloud Aktif</p>
              </div>
           </div>
           <div className="flex flex-wrap gap-2">
             <button onClick={() => setIsPrintMode(true)} className="bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-black transition-all shadow-lg"><Printer size={16}/> PRATINJAU</button>
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-[24px] border border-slate-100">
          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Mapel</label><select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none" value={filterMapel} onChange={e => setFilterMapel(e.target.value)}>{availableMapel.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 flex items-center gap-1">Kelas {isClassLocked && <Lock size={10} className="text-amber-500" />}</label><select disabled={isClassLocked} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none disabled:bg-slate-100" value={filterKelas} onChange={e => handleKelasChange(e.target.value as Kelas)}>{['1','2','3','4','5','6'].map(k => <option key={k} value={k}>Kelas {k}</option>)}</select></div>
          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Semester</label><select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none" value={filterSemester} onChange={e => setFilterSemester(e.target.value as '1' | '2')}><option value="1">1 (Ganjil)</option><option value="2">2 (Genap)</option></select></div>
          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Fase</label><div className="w-full bg-slate-200 rounded-xl p-3 text-sm font-black text-slate-600">{filterFase}</div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1 bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 bg-slate-900 text-white flex items-center gap-3">
             <Split size={20} className="text-cyan-400"/>
             <h3 className="text-xs font-black uppercase tracking-widest">Rujukan ATP Cloud</h3>
          </div>
          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto no-scrollbar">
            {atpData.filter(a => a.kelas === filterKelas && a.mataPelajaran === filterMapel).length === 0 ? (
              <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 font-bold uppercase text-[10px]">Belum ada ATP tersedia</div>
            ) : atpData.filter(a => a.kelas === filterKelas && a.mataPelajaran === filterMapel).map(atp => {
              const alreadyHasRpm = rpmList.some(r => r.atpId === atp.id && r.semester === filterSemester);
              return (
                <div key={atp.id} className={`p-4 rounded-2xl border transition-all ${alreadyHasRpm ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:border-cyan-400'}`}>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="bg-white border px-2 py-0.5 rounded text-[8px] font-black text-slate-500 uppercase">{atp.alokasiWaktu} JP</span>
                    {alreadyHasRpm && <CheckCircle2 className="text-emerald-500" size={14}/>}
                  </div>
                  <h4 className="text-[10px] font-black text-slate-800 uppercase mb-2 line-clamp-2">{atp.materi}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed mb-4 line-clamp-3 italic">"{atp.tujuanPembelajaran}"</p>
                  <button disabled={alreadyHasRpm} onClick={() => handleCreateRPMFromATP(atp)} className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all ${alreadyHasRpm ? 'bg-emerald-500 text-white opacity-50' : 'bg-cyan-600 hover:bg-cyan-700 text-white'}`}>
                    {alreadyHasRpm ? 'TERDAFTAR' : <><Plus size={14}/> SUSUN RPM</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
           {sortedRPM.length === 0 ? (
             <div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-slate-200 text-slate-400 font-black uppercase tracking-widest text-sm">Belum Ada RPM Terpilih</div>
           ) : sortedRPM.map(rpm => (
             <div key={rpm.id} className={`bg-white rounded-[40px] shadow-xl border-2 transition-all ${isEditing === rpm.id ? 'border-cyan-500 ring-4 ring-cyan-50' : 'border-slate-100'}`}>
                <div className="p-8">
                   <div className="flex justify-between items-start gap-6 mb-8">
                      <div className="flex-1">
                         <div className="flex items-center gap-3 mb-2">
                            <span className="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">UNIT PEMBELAJARAN</span>
                            <span className="text-slate-300 font-black">•</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">KELAS {rpm.kelas} | SEM {rpm.semester}</span>
                         </div>
                         <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-4">{rpm.materi}</h3>
                         <div className="flex flex-wrap gap-4 text-[10px] font-black text-slate-500 uppercase">
                            {/* Corrected name from Lock to Clock */}
                            <div className="flex items-center gap-2"><Clock size={14}/> {rpm.alokasiWaktu} JP</div>
                            {/* Corrected missing Layout icon */}
                            <div className="flex items-center gap-2"><Layout size={14}/> {rpm.praktikPedagogis || 'Belum diatur'}</div>
                         </div>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => setIsEditing(isEditing === rpm.id ? null : rpm.id)} className={`p-3 rounded-2xl transition-all ${isEditing === rpm.id ? 'bg-cyan-600 text-white shadow-xl' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                           {/* Corrected missing Save icon */}
                           {isEditing === rpm.id ? <Save size={20}/> : <PencilLine size={20}/>}
                         </button>
                         <button onClick={() => setDeleteConfirmId(rpm.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={20}/></button>
                      </div>
                   </div>

                   {isEditing === rpm.id ? (
                      <div className="space-y-8 animate-in slide-in-from-top-4">
                         <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-[32px] border border-slate-200">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Topik/Materi</label><input className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black text-slate-800" value={rpm.materi} onChange={e => updateRPM(rpm.id, 'materi', e.target.value)} /></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Model Pembelajaran</label><select className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black" value={rpm.praktikPedagogis} onChange={e => updateRPM(rpm.id, 'praktikPedagogis', e.target.value)}><option value="">Pilih Model</option><option value="Problem Based Learning">PBL</option><option value="Project Based Learning">PjBL</option><option value="Discovery Learning">Discovery</option><option value="Inkuiri">Inkuiri</option></select></div>
                         </div>
                         <div className="p-8 border-2 border-dashed border-cyan-200 rounded-[32px] bg-cyan-50/30 flex flex-col items-center gap-4">
                            <Sparkles className="text-cyan-500" size={32}/>
                            <p className="text-[11px] font-black text-cyan-700 uppercase tracking-[0.2em] text-center">Engine Deep Learning SDN 5 Bilato</p>
                            <button onClick={() => handleGenerateAI(rpm.id)} disabled={isLoadingAI} className="bg-cyan-600 hover:bg-cyan-700 text-white px-10 py-4 rounded-2xl font-black text-xs shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center gap-3">
                               {isLoadingAI ? <Loader2 className="animate-spin" size={18}/> : <Wand2 size={18}/>} SINKRONKAN DENGAN AI
                            </button>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                               <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2"><Zap size={14} className="text-amber-500"/> I. Kegiatan Awal</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs min-h-[120px]" value={rpm.kegiatanAwal} onChange={e => updateRPM(rpm.id, 'kegiatanAwal', e.target.value)} /></div>
                               <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2"><Rocket size={14} className="text-cyan-500"/> II. Kegiatan Inti (Bermakna)</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs min-h-[250px]" value={rpm.kegiatanInti} onChange={e => updateRPM(rpm.id, 'kegiatanInti', e.target.value)} /></div>
                            </div>
                            <div className="space-y-6">
                               <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500"/> III. Kegiatan Penutup</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs min-h-[120px]" value={rpm.kegiatanPenutup} onChange={e => updateRPM(rpm.id, 'kegiatanPenutup', e.target.value)} /></div>
                               <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2"><FileText size={14} className="text-indigo-500"/> IV. Lampiran Bahan Bacaan</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs min-h-[250px]" value={rpm.materiAjar} onChange={e => updateRPM(rpm.id, 'materiAjar', e.target.value)} placeholder="Tuliskan ringkasan materi atau bahan bacaan siswa di sini..." /></div>
                            </div>
                         </div>
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-[11px] leading-relaxed">
                         <div className="space-y-6">
                            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                               <p className="font-black text-slate-400 uppercase text-[9px] mb-3 tracking-widest">Tujuan Pembelajaran</p>
                               <p className="text-slate-800 font-bold italic">"{rpm.tujuanPembelajaran}"</p>
                            </div>
                         </div>
                         <div className="md:col-span-2 grid grid-cols-2 gap-6">
                            <div className="p-6 bg-slate-900 text-white rounded-[32px] shadow-xl">
                               <div className="flex items-center gap-2 mb-4 text-cyan-400"><Brain size={16}/> <span className="font-black uppercase tracking-tighter">Konsep Inti</span></div>
                               {renderListContent(rpm.kegiatanInti.substring(0, 200) + '...')}
                            </div>
                            <div className="p-6 bg-white border border-slate-200 rounded-[32px]">
                               <div className="flex items-center gap-2 mb-4 text-indigo-600"><CheckCircle2 size={16}/> <span className="font-black uppercase tracking-tighter">Instrumen Asesmen</span></div>
                               <p className="text-slate-500 font-medium">{rpm.asesmenTeknik || '-'}</p>
                            </div>
                         </div>
                      </div>
                   )}
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default RPMManager;