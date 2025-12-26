
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Inisialisasi AI menggunakan API_KEY dari environment variable.
 */
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error('API_KEY_MISSING');
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Menangani error dari Gemini API
 */
const handleGeminiError = (error: any) => {
  console.error("Gemini API Error:", error);
  const msg = error.message || '';
  
  if (msg.includes('API key not found') || msg.includes('API_KEY_INVALID')) {
    throw new Error('API_KEY_MISSING');
  }
  if (msg.includes('Requested entity was not found')) {
    // Error ini biasanya berarti model Gemini 3 belum di-whitelist untuk API Key Anda
    throw new Error('MODEL_NOT_READY');
  }
  if (msg.includes('429')) {
    throw new Error('QUOTA_EXCEEDED');
  }
  throw error;
};

export const startAIChat = async (systemInstruction: string) => {
  try {
    const ai = getAI();
    return ai.chats.create({
      model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-flash-preview',
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

export const recommendPedagogy = async (tp: string, alurAtp: string, materi: string, kelas: string) => {
  try {
    const ai = getAI();
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

export const generateRPMContent = async (tp: string, materi: string, kelas: string, praktikPedagogis: string, alokasiWaktu: string, jumlahPertemuan: number = 1) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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
      model: 'gemini-3-flash-preview',
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
