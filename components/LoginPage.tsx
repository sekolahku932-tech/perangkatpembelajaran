
import React, { useState } from 'react';
import { School, Lock, User as UserIcon, LogIn, AlertCircle, Loader2, Database, CheckCircle, Code } from 'lucide-react';
// Import centralized firebase service
import { auth, signInWithEmailAndPassword } from '../services/firebase';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Normalisasi input: Trim spasi dan buat huruf kecil untuk username
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError('Username dan Password wajib diisi.');
      setLoading(false);
      return;
    }

    // Pemetaan ke format email Firebase (sama dengan UserManager)
    let email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@sdn5bilato.sch.id`;
    
    // Logika Password: Jika kurang dari 6 karakter, lakukan padding hingga minimal 6 karakter
    // Hal ini karena Firebase membutuhkan minimal 6 karakter untuk password.
    let pwd = cleanPassword;
    if (pwd.length < 6) {
      // Mengulang password asli sampai minimal 6 karakter (misal: "12" -> "121212")
      pwd = cleanPassword.repeat(Math.ceil(6 / cleanPassword.length));
    }

    try {
      await signInWithEmailAndPassword(auth, email, pwd);
      setSuccess('Login Berhasil! Memuat data cloud...');
    } catch (err: any) {
      console.error("Login Error:", err.code, err.message);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Akses ditolak: Username atau Password salah. Hubungi Admin jika Anda belum terdaftar.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Koneksi internet bermasalah. Periksa jaringan Anda.');
      } else {
        setError('Sistem Sibuk: ' + (err.message || 'Coba lagi nanti.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-2xl text-white shadow-xl mb-4 animate-in zoom-in duration-500">
            <School size={48} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SD NEGERI 5 BILATO</h1>
          <p className="text-slate-500 font-medium uppercase text-xs tracking-[0.2em] mt-1">Sistem Cloud Perangkat Pembelajaran</p>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-8 duration-700">
          <div className="p-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Login Guru / Admin</h2>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase">
                <Database size={10} /> Cloud Secured
              </div>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in shake duration-500">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-600 animate-in fade-in">
                <CheckCircle size={20} className="shrink-0" />
                <p className="text-sm font-bold">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Username / NIP</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <UserIcon size={18} />
                  </div>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all placeholder:text-slate-300"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all placeholder:text-slate-300"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 text-xs tracking-widest uppercase"
              >
                {loading ? <Loader2 size={18} className="animate-spin"/> : <LogIn size={18} />}
                {loading ? 'MEMVALIDASI...' : 'LOGIN KE CLOUD'}
              </button>
            </form>
          </div>
          
          <div className="bg-slate-50 p-6 border-t border-slate-100 text-center">
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <Code size={12} />
              <p className="text-[10px] font-black uppercase tracking-widest">
                Developed by Ariyanto Rahman
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
