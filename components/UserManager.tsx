
import React, { useState, useEffect } from 'react';
import { User, Role, TeacherType, MATA_PELAJARAN } from '../types';
import { Trash2, Edit2, Save, X, Users, Shield, UserCheck, BookOpen, Building2, AlertTriangle, Loader2, Cloud, Home, Briefcase } from 'lucide-react';
import { db, auth, collection, onSnapshot, doc, setDoc, deleteDoc, createUserWithEmailAndPassword } from '../services/firebase';

interface UserManagerProps {
  user: User;
}

const UserManager: React.FC<UserManagerProps> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    password: '',
    role: 'guru',
    teacherType: 'kelas',
    name: '',
    nip: '',
    kelas: '',
    mapelDiampu: []
  });
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const userList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as User[];
      setUsers(userList);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    const cleanUsername = formData.username?.trim().toLowerCase();
    const cleanPassword = formData.password?.trim();
    const cleanName = formData.name?.trim();

    if (!cleanUsername || !cleanName || (!isEditing && !cleanPassword)) {
      alert('Username, Password, dan Nama Lengkap wajib diisi!');
      return;
    }

    setIsSaving(true);
    try {
      const userEmail = `${cleanUsername}@sdn5bilato.sch.id`;
      let userPwd = cleanPassword || '';
      if (!isEditing && userPwd.length < 6) {
        userPwd = userPwd + userPwd;
      }

      if (isEditing) {
        await setDoc(doc(db, "users", isEditing), {
          username: cleanUsername,
          role: formData.role,
          teacherType: formData.teacherType,
          name: cleanName,
          nip: formData.nip?.trim() || '-',
          kelas: formData.kelas?.trim() || '-',
          mapelDiampu: formData.mapelDiampu || []
        }, { merge: true });
        
        setIsEditing(null);
        alert('Data profil diperbarui!');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, userEmail, userPwd);
        const firebaseUid = userCredential.user.uid;

        await setDoc(doc(db, "users", firebaseUid), {
          username: cleanUsername,
          role: formData.role,
          teacherType: formData.teacherType,
          name: cleanName,
          nip: formData.nip?.trim() || '-',
          kelas: formData.kelas?.trim() || '-',
          mapelDiampu: formData.mapelDiampu || []
        });

        alert(`User @${cleanUsername} berhasil didaftarkan!`);
      }
      resetForm();
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        alert('Username sudah terdaftar!');
      } else {
        alert('Gagal menyimpan: ' + error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'guru',
      teacherType: 'kelas',
      name: '',
      nip: '',
      kelas: '',
      mapelDiampu: []
    });
    setIsEditing(null);
  };

  const startEdit = (u: User) => {
    setIsEditing(u.id);
    setFormData({
      ...u,
      password: 'HIDDEN'
    });
  };

  const executeDeleteUser = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, "users", deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (e) {
      alert('Gagal menghapus data.');
    }
  };

  const toggleMapel = (mapel: string) => {
    const currentMapel = formData.mapelDiampu || [];
    if (currentMapel.includes(mapel)) {
      setFormData({ ...formData, mapelDiampu: currentMapel.filter(m => m !== mapel) });
    } else {
      setFormData({ ...formData, mapelDiampu: [...currentMapel, mapel] });
    }
  };

  if (loading) {
    return (
      <div className="py-40 flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 size={48} className="animate-spin text-blue-600" />
        <p className="font-black text-xs uppercase tracking-widest">Sinkronisasi Database User...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Hapus Pengguna</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">Hapus data profil dari database Cloud?</p>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-slate-500 bg-white border border-slate-200">BATAL</button>
              <button onClick={executeDeleteUser} className="flex-1 px-6 py-3 rounded-xl text-xs font-black text-white bg-red-600 shadow-lg">HAPUS</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <UserCheck size={20} />
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">
                  {isEditing ? 'Edit Profil Guru' : 'Daftarkan Guru Baru'}
                </h3>
              </div>
              <Cloud size={16} className="text-blue-500" />
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jenis Guru (Akses Kelas)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setFormData({...formData, teacherType: 'kelas'})}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black transition-all border ${formData.teacherType === 'kelas' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                  >
                    <Home size={14} /> GURU KELAS
                  </button>
                  <button 
                    onClick={() => setFormData({...formData, teacherType: 'mapel'})}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black transition-all border ${formData.teacherType === 'mapel' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                  >
                    <Briefcase size={14} /> GURU MAPEL
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 italic leading-tight px-1">
                  *Guru Kelas akan dikunci aksesnya ke satu kelas yang dipilih. Guru Mapel dapat mengakses semua kelas.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Username</label>
                  <input 
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                    value={formData.username}
                    disabled={!!isEditing}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Password</label>
                  <input 
                    type="password"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                    value={formData.password}
                    disabled={!!isEditing}
                    placeholder={isEditing ? "••••••" : ""}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Nama Lengkap & Gelar</label>
                <input 
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">NIP</label>
                  <input 
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.nip}
                    onChange={e => setFormData({...formData, nip: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Role Akses</label>
                  <select 
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as Role})}
                  >
                    <option value="guru">Guru</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">
                  {formData.teacherType === 'kelas' ? 'Kelas Homebase (Terkunci)' : 'Kelas Utama (Referensi)'}
                </label>
                <select 
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={formData.kelas}
                  onChange={e => setFormData({...formData, kelas: e.target.value})}
                >
                  <option value="">Pilih Kelas</option>
                  {['1','2','3','4','5','6','-'].map(k => <option key={k} value={k}>Kelas {k}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Mata Pelajaran Diampu</label>
                <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100 scrollbar-thin">
                  {MATA_PELAJARAN.map(m => (
                    <label key={m} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded text-blue-600 focus:ring-blue-500"
                        checked={formData.mapelDiampu?.includes(m)}
                        onChange={() => toggleMapel(m)}
                      />
                      <span className="text-[11px] font-semibold text-slate-700">{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                  {isEditing ? 'UPDATE' : 'DAFTARKAN'}
                </button>
                {isEditing && (
                  <button onClick={resetForm} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold p-3 rounded-xl transition-all">
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Users size={20} />
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">User Aktif Cloud</h3>
              </div>
              <span className="text-[10px] font-black bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-500">
                {users.length} PENGGUNA
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4">Profil & NIP</th>
                    <th className="px-6 py-4">Tipe Guru</th>
                    <th className="px-6 py-4">Tugas</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="group hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm uppercase">{u.name}</div>
                        <div className="text-[10px] font-medium text-slate-400">@{u.username} | NIP. {u.nip || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {u.teacherType === 'kelas' ? (
                            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">
                              <Home size={10} /> Guru Kelas
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">
                              <Briefcase size={10} /> Guru Mapel
                            </span>
                          )}
                          {u.role === 'admin' && (
                            <span className="bg-slate-900 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Admin</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 mb-1">
                          <Building2 size={10} className="text-slate-400" /> Kelas {u.kelas || '-'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-500">
                          <BookOpen size={10} className="text-slate-400" /> {u.mapelDiampu?.length || 0} Mapel
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setDeleteConfirmId(u.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                            <Trash2 size={16} />
                          </button>
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

export default UserManager;
