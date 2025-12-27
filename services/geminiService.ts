
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Variabel internal untuk menyimpan kunci yang diambil dari Firebase atau LocalStorage
 */
let dynamicApiKey: string | null = null;

export const setGeminiKey = (key: string) => {
  if (key && key.trim() !== '') {
    dynamicApiKey = key.trim();
    console.log("AI Service: Kunci Cloud/Local telah disetel.");
  }
};

const getApiKey = () => {
  // 1. Prioritas: Kunci dari Database (Firebase/Local)
  if (dynamicApiKey) return dynamicApiKey;

  // 2. Backup: LocalStorage
  const storedKey = localStorage.getItem('GEMINI_API_KEY');
  if (storedKey && storedKey.trim() !== '') return storedKey;

  // 3. Terakhir: Environment Variable
  const envKey = process.env.API_KEY || (window as any).process?.env?.API_KEY;
  if (envKey && envKey !== 'undefined' && envKey !== '') return envKey;

  return null;
};

/**
 * MENGGUNAKAN FLASH UNTUK SEMUA TUGAS
 * Akun gratis memiliki kuota jauh lebih besar di model Flash (15 RPM) 
 * dibandingkan model Pro (hanya 2 RPM). Ini solusi utama untuk error 429.
 */
const DEFAULT_MODEL = 'gemini-3-flash-preview';

const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("AI Error: Kunci API tidak ditemukan di sistem.");
    throw new Error('API_KEY_MISSING');
  }
  return new GoogleGenAI({ apiKey });
};

const handleGeminiError = (error: any) => {
  console.error("DEBUG Gemini Detail Error:", error);
  const errorStr = JSON.stringify(error).toLowerCase();
  const msg = (error.message || '').toLowerCase();
  
  if (msg.includes('api key not found') || msg.includes('invalid') || msg === 'api_key_missing') {
    throw new Error('API_KEY_MISSING');
  }
  
  // Deteksi Kuota Habis (Error 429)
  if (errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('resource_exhausted') || errorStr.includes('limit')) {
    throw new Error('QUOTA_EXCEEDED');
  }

  if (msg.includes('requested entity was not found') || msg.includes('model not found')) {
    throw new Error('MODEL_NOT_READY');
  }

  throw error;
};

export const startAIChat = async (systemInstruction: string) => {
  try {
    const ai = getAI();
    return ai.chats.create({
      model: DEFAULT_MODEL,
      config: { systemInstruction, temperature: 0.7 },
    });
  } catch (error) {
    return handleGeminiError(error);
  }
};

export const analyzeCPToTP = async (cpContent: string, elemen: string, fase: string, kelas: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Pecah CP menjadi materi dan TP linear untuk SD Kelas ${kelas}. Elemen: ${elemen}. CP: "${cpContent}"`,
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

export const completeATPDetails = async (tp: string, materi: string, kelas: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
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

export const recommendPedagogy = async (tp: string, alurAtp: string, materi: string, kelas: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
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

export const generateRPMContent = async (tp: string, materi: string, kelas: string, praktikPedagogis: string, alokasiWaktu: string, jumlahPertemuan: number = 1) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Susun RPM SD Kelas ${kelas} (${jumlahPertemuan} sesi). Tujuan: ${tp}. Materi: ${materi}. Model: ${praktikPedagogis}. Gunakan format daftar bernomor vertikal.`,
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

export const generateAssessmentDetails = async (tp: string, materi: string, kelas: string, narasiAwal: string, narasiProses: string, narasiAkhir: string) => {
  try {
    const ai = getAI();
    // Mengalihkan ke FLASH agar tidak terkena limit 429 yang ketat di model PRO
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Buat rubrik asesmen lengkap 3 BAGIAN (AWAL, PROSES, AKHIR) untuk TP: "${tp}" SD Kelas ${kelas}.`,
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
                  }
                }
              }
            }
          }
        }
      }
    });
    return response.text?.trim() || "[]";
  } catch (error: any) {
    return handleGeminiError(error);
  }
};

export const generateLKPDContent = async (rpm: any) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Susun LKPD untuk SD Kelas ${rpm.kelas}. Topik: ${rpm.materi}.`,
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
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    return handleGeminiError(error);
  }
};
