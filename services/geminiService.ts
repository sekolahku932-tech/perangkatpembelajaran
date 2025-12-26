
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Helper to ensure API Key is present and create a fresh instance
 */
const getAIInstance = async () => {
  // Cek apakah ada di process.env (Vercel Build-time)
  let apiKey = process.env.API_KEY;

  // Cek apakah ada di window.aistudio (Vercel/AI Studio Runtime)
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        throw new Error('API_KEY_MISSING');
      }
      // Jika sudah dipilih, variabel ini akan terinjeksi otomatis ke process.env.API_KEY oleh platform
      apiKey = process.env.API_KEY;
    }
  }

  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error('API_KEY_MISSING');
  }

  return new GoogleGenAI({ apiKey });
};

/**
 * Helper to handle Gemini API errors
 */
const handleGeminiError = (error: any) => {
  console.error("Gemini API Error Detail:", error);
  
  const msg = error.message || '';
  
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key not found') || msg === 'API_KEY_MISSING') {
    throw new Error('API_KEY_MISSING');
  }
  
  if (msg.includes('Requested entity was not found.')) {
    // Ini biasanya berarti model tidak tersedia atau API belum diaktifkan di Google Cloud
    throw new Error('MODEL_NOT_FOUND');
  }

  if (msg.includes('429')) {
    throw new Error('QUOTA_EXHAUSTED');
  }
  
  throw error;
};

/**
 * Chat Stream for interactive assistant (GPT-style)
 */
export const startAIChat = async (systemInstruction: string) => {
  try {
    const ai = await getAIInstance();
    return ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
  } catch (error) {
    return handleGeminiError(error);
  }
};

/**
 * Analyzes CP content into specific Materi and TP
 */
export const analyzeCPToTP = async (cpContent: string, elemen: string, fase: string, kelas: string) => {
  try {
    const ai = await getAIInstance();
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
    const ai = await getAIInstance();
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
    const ai = await getAIInstance();
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
    const ai = await getAIInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Susun Rencana Pembelajaran Mendalam (RPM) SD Kelas ${kelas} untuk ${jumlahPertemuan} kali pertemuan. 
      Tujuan: ${tp}. Materi: ${materi}. Model: ${praktikPedagogis}.
      
      ATURAN FORMAT WAJIB:
      1. Field 'kegiatanAwal', 'kegiatanInti' dan 'kegiatanPenutup' WAJIB menggunakan format daftar bernomor (1., 2., 3., dst).
      2. Setiap poin kegiatan harus dipisahkan oleh baris baru.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            praktikPedagogis: { type: Type.STRING },
            kemitraan: { type: Type.STRING },
            lingkunganBelajar: { type: Type.STRING },
            pemanfaatanDigital: { type: Type.STRING },
            kegiatanAwal: { type: Type.STRING },
            kegiatanInti: { type: Type.STRING },
            kegiatanPenutup: { type: Type.STRING }
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
    const ai = await getAIInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Buat rubrik asesmen lengkap 3 BAGIAN (AWAL, PROSES, AKHIR) untuk TP: "${tp}" materi "${materi}" SD Kelas ${kelas}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              kategori: { type: Type.STRING },
              teknik: { type: Type.STRING },
              bentuk: { type: Type.STRING },
              instruksi: { type: Type.STRING },
              rubrikDetail: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    aspek: { type: Type.STRING },
                    level4: { type: Type.STRING },
                    level3: { type: Type.STRING },
                    level2: { type: Type.STRING },
                    level1: { type: Type.STRING }
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
    const ai = await getAIInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Susun LKPD untuk SD Kelas ${rpm.kelas}. Topik: ${rpm.materi}. Tujuan: ${rpm.tujuanPembelajaran}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            petunjuk: { type: Type.STRING },
            materiRingkas: { type: Type.STRING },
            langkahKerja: { type: Type.STRING },
            tugasMandiri: { type: Type.STRING },
            refleksi: { type: Type.STRING }
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
