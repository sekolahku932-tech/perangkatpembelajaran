
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Helper to handle Gemini API errors
 */
const handleGeminiError = (error: any) => {
  console.error("Gemini API Error:", error);
  if (error.message?.includes('Requested entity was not found.')) {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      window.aistudio.openSelectKey();
    }
  }
  if (error.message?.includes('429')) {
    throw new Error('QUOTA_EXHAUSTED');
  }
  throw error;
};

/**
 * Chat Stream for interactive assistant (GPT-style)
 */
export const startAIChat = (systemInstruction: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });
};

/**
 * Analyzes CP content into specific Materi and TP
 */
export const analyzeCPToTP = async (cpContent: string, elemen: string, fase: string, kelas: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Pecah teks CP menjadi materi dan TP linear. Elemen: ${elemen}. CP: "${cpContent}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              materi: { type: Type.STRING },
              subMateri: { type: Type.STRING },
              tp: { type: Type.STRING }
            },
            required: ['materi', 'subMateri', 'tp']
          },
        }
      }
    });
    return JSON.parse(response.text?.trim() || '[]');
  } catch (error: any) {
    return handleGeminiError(error);
  }
};

/**
 * Completes ATP details
 */
export const completeATPDetails = async (tp: string, materi: string, kelas: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Lengkapi ATP SD Kelas ${kelas}. Materi: ${materi}, TP: ${tp}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alurTujuan: { type: Type.STRING },
            alokasiWaktu: { type: Type.STRING },
            dimensiOfProfil: { type: Type.STRING },
            asesmenAwal: { type: Type.STRING },
            asesmenProses: { type: Type.STRING },
            asesmenAkhir: { type: Type.STRING },
            sumberBelajar: { type: Type.STRING }
          },
          required: ['alurTujuan', 'alokasiWaktu', 'dimensiOfProfil', 'asesmenAwal', 'asesmenProses', 'asesmenAkhir', 'sumberBelajar']
        }
      }
    });
    return JSON.parse(response.text?.trim() || '{}');
  } catch (error: any) {
    return handleGeminiError(error);
  }
};

/**
 * Recommend pedagogy
 */
export const recommendPedagogy = async (tp: string, alurAtp: string, materi: string, kelas: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Rekomendasi model pembelajaran untuk TP: "${tp}" SD Kelas ${kelas}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            modelName: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ['modelName', 'reason']
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    return handleGeminiError(error);
  }
};

/**
 * Generates RPM content with strict vertical list formatting
 */
export const generateRPMContent = async (tp: string, materi: string, kelas: string, praktikPedagogis: string, alokasiWaktu: string, jumlahPertemuan: number = 1) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Susun Rencana Pembelajaran Mendalam (RPM) SD Kelas ${kelas} untuk ${jumlahPertemuan} kali pertemuan. 
      Tujuan: ${tp}. Materi: ${materi}. Model: ${praktikPedagogis}.
      
      ATURAN FORMAT WAJIB:
      1. Field 'kegiatanAwal', 'kegiatanInti', and 'kegiatanPenutup' WAJIB menggunakan format daftar bernomor (1., 2., 3., dst).
      2. Setiap poin kegiatan harus dipisahkan oleh baris baru (newline/enter).
      3. DILARANG membuat teks dalam satu paragraf panjang.
      4. Gunakan kalimat yang praktis untuk guru di sekolah.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            praktikPedagogis: { type: Type.STRING },
            kemitraan: { type: Type.STRING },
            lingkunganBelajar: { type: Type.STRING },
            pemanfaatanDigital: { type: Type.STRING },
            kegiatanAwal: { type: Type.STRING, description: "Wajib Daftar Bernomor 1, 2, 3... Urut ke bawah" },
            kegiatanInti: { type: Type.STRING, description: "Wajib Daftar Bernomor 1, 2, 3... Urut ke bawah" },
            kegiatanPenutup: { type: Type.STRING, description: "Wajib Daftar Bernomor 1, 2, 3... Urut ke bawah" }
          },
          required: ['praktikPedagogis', 'kemitraan', 'lingkunganBelajar', 'pemanfaatanDigital', 'kegiatanAwal', 'kegiatanInti', 'kegiatanPenutup']
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    return handleGeminiError(error);
  }
};

/**
 * Generates Assessment Details (Awal, Proses, Akhir)
 */
export const generateAssessmentDetails = async (tp: string, materi: string, kelas: string, narasiAwal: string, narasiProses: string, narasiAkhir: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Buat rubrik asesmen lengkap 3 BAGIAN (AWAL, PROSES, AKHIR) untuk TP: "${tp}" materi "${materi}" SD Kelas ${kelas}.
      
      Gunakan referensi teknik dari ATP berikut:
      1. ASESMEN AWAL: ${narasiAwal}
      2. ASESMEN PROSES: ${narasiProses}
      3. ASESMEN AKHIR: ${narasiAkhir}
      
      DILARANG memberikan narasi pembuka atau penutup. Berikan HANYA JSON array berisi 3 objek.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              kategori: { type: Type.STRING, description: "AWAL, PROSES, atau AKHIR" },
              teknik: { type: Type.STRING },
              bentuk: { type: Type.STRING },
              instruksi: { type: Type.STRING },
              rubrikDetail: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    aspek: { type: Type.STRING },
                    level4: { type: Type.STRING, description: "Sangat Baik" },
                    level3: { type: Type.STRING, description: "Baik" },
                    level2: { type: Type.STRING, description: "Cukup" },
                    level1: { type: Type.STRING, description: "Perlu Bimbingan" }
                  },
                  required: ['aspek', 'level4', 'level3', 'level2', 'level1']
                }
              }
            },
            required: ['kategori', 'teknik', 'bentuk', 'instruksi', 'rubrikDetail']
          }
        }
      }
    });
    return response.text?.trim() || "[]";
  } catch (error: any) {
    return handleGeminiError(error);
  }
};

/**
 * Generates LKPD Content synchronized with RPM
 */
export const generateLKPDContent = async (rpm: any) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Memberikan konteks lengkap RPM agar LKPD sinkron
    const prompt = `Susun konten Lembar Kerja Peserta Didik (LKPD) untuk SD Kelas ${rpm.kelas}.
    
    REFERENSI UTAMA DARI RENCANA PEMBELAJARAN (RPM):
    - Topik: ${rpm.materi}
    - Tujuan: ${rpm.tujuanPembelajaran}
    - Model Pembelajaran: ${rpm.praktikPedagogis}
    - Langkah Awal (Memahami): ${rpm.kegiatanAwal}
    - Langkah Inti (Mengaplikasi): ${rpm.kegiatanInti}
    - Langkah Penutup (Merefleksi): ${rpm.kegiatanPenutup}
    
    INSTRUKSI KHUSUS:
    1. 'langkahKerja' harus merupakan turunan teknis dari 'Langkah Inti (Mengaplikasi)' yang ada di RPM.
    2. Sesuaikan tingkat kesulitan tugas mandiri dengan model pembelajaran '${rpm.praktikPedagogis}'.
    3. Semua poin (petunjuk, langkah kerja, tugas, refleksi) WAJIB menggunakan format daftar bernomor vertikal (1., 2., 3., dst).
    4. Jika ada lebih dari 1 pertemuan, pisahkan narasi dengan tag 'Pertemuan 1:', 'Pertemuan 2:', dst.
    5. Gunakan bahasa yang ramah anak sekolah dasar.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            petunjuk: { type: Type.STRING, description: "Petunjuk pengerjaan (Daftar bernomor)" },
            materiRingkas: { type: Type.STRING, description: "Ringkasan konsep (Daftar bernomor)" },
            langkahKerja: { type: Type.STRING, description: "Urutan aktivitas siswa (Daftar bernomor)" },
            tugasMandiri: { type: Type.STRING, description: "Tantangan atau soal latihan (Daftar bernomor)" },
            refleksi: { type: Type.STRING, description: "Pertanyaan refleksi diri (Daftar bernomor)" }
          },
          required: ['petunjuk', 'materiRingkas', 'langkahKerja', 'tugasMandiri', 'refleksi']
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    return handleGeminiError(error);
  }
};
