
import { GoogleGenAI, Type } from "@google/genai";
import { UploadedFile } from "../types";

/**
 * PENTING: SDN 5 Bilato Cloud HANYA menggunakan model FLASH 3.
 * Model Pro (gemini-3-pro) DILARANG karena limit kuota akun gratis (Limit 0).
 */
const MODEL_NAME = 'gemini-3-flash-preview';

const cleanJsonString = (str: string): string => {
  if (!str) return '';
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * Handler Error: Memberikan instruksi jelas jika kuota guru habis
 */
const formatAIError = (error: any): string => {
  const errorStr = typeof error === 'string' ? error : (error?.message || "");
  console.error("DEBUG AI ERROR:", errorStr);

  if (errorStr.includes('429') || errorStr.includes('QUOTA') || errorStr.includes('RESOURCE_EXHAUSTED')) {
    return "BATAS KUOTA: API Key pribadi Anda telah mencapai batas gratis menit ini. Mohon tunggu 60 detik sebelum mencoba lagi.";
  }

  if (errorStr.includes('Limit: 0') || errorStr.includes('PRO')) {
    return "MODEL TIDAK TERSEDIA: Google membatasi akun Anda untuk model Pro. Sistem sudah diarahkan ke Flash, harap pastikan API Key Anda benar-benar valid.";
  }

  if (errorStr.includes('API_KEY_REQUIRED')) {
    return "AKSES DITOLAK: Anda belum mengatur API Key di Profil. Klik Nama Anda di pojok kiri bawah untuk memasukkan kunci.";
  }

  return `GANGGUAN KUNCI: Pastikan API Key Anda benar dan baru. Error: ${errorStr.substring(0, 50)}...`;
};

/**
 * LOGIKA ISOLASI KUNCI:
 * Fungsi ini HANYA akan mengambil kunci dari parameter 'customKey'.
 * Tidak ada lagi fallback ke process.env atau variabel rahasia lainnya.
 */
const getApiKey = (customKey?: string) => {
  const key = customKey?.trim();
  if (key && key.length > 20) {
    return key;
  }
  // Jika tidak ada kunci yang dilewatkan dari profil user, lemparkan error
  throw new Error('API_KEY_REQUIRED');
};

export const startAIChat = async (systemInstruction: string, apiKey?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
    return ai.chats.create({
      model: MODEL_NAME,
      config: { systemInstruction, temperature: 0.7 },
    });
  } catch (e) { throw new Error(formatAIError(e)); }
};

export const analyzeDocuments = async (files: UploadedFile[], prompt: string, apiKey?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
    const fileParts = files.map(file => ({
      inlineData: { data: file.base64.split(',')[1], mimeType: file.type }
    }));
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts: [...fileParts, { text: prompt }] }
    });
    return response.text || "AI tidak merespon.";
  } catch (e) { throw new Error(formatAIError(e)); }
};

export const analyzeCPToTP = async (cpContent: string, elemen: string, fase: string, kelas: string, apiKey?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analisis CP ini menjadi TP SD Kelas ${kelas}: "${cpContent}"`,
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
            required: ['materi', 'tp']
          }
        }
      }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) { throw new Error(formatAIError(e)); }
};

export const completeATPDetails = async (tp: string, materi: string, kelas: string, apiKey?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Lengkapi detail ATP SD Kelas ${kelas} materi ${materi} untuk TP: ${tp}`,
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
          }
        }
      }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (e) { throw new Error(formatAIError(e)); }
};

export const recommendPedagogy = async (tp: string, alurAtp: string, materi: string, kelas: string, apiKey?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Rekomendasi model pembelajaran untuk TP: ${tp}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            modelName: { type: Type.STRING },
            reason: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (e) { throw new Error(formatAIError(e)); }
};

export const generateRPMContent = async (tp: string, materi: string, kelas: string, praktikPedagogis: string, alokasiWaktu: string, jumlahPertemuan: number = 1, apiKey?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Susun RPM mendalam untuk TP: ${tp}. Model: ${praktikPedagogis}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            kemitraan: { type: Type.STRING },
            lingkunganBelajar: { type: Type.STRING },
            pemanfaatanDigital: { type: Type.STRING },
            kegiatanAwal: { type: Type.STRING },
            kegiatanInti: { type: Type.STRING },
            kegiatanPenutup: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (e) { throw new Error(formatAIError(e)); }
};

export const generateAssessmentDetails = async (tp: string, materi: string, kelas: string, apiKey?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Buat instrumen asesmen untuk TP: ${tp}`,
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
              soalAtauTugas: { type: Type.STRING },
              rubrikDetail: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { aspek: { type: Type.STRING }, level4: { type: Type.STRING }, level3: { type: Type.STRING }, level2: { type: Type.STRING }, level1: { type: Type.STRING } } } }
            }
          }
        }
      }
    });
    return cleanJsonString(response.text || '[]');
  } catch (e) { throw new Error(formatAIError(e)); }
};

export const generateLKPDContent = async (rpm: any, apiKey?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Buat LKPD dari TP: ${rpm.tujuanPembelajaran}`,
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
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (e) { throw new Error(formatAIError(e)); }
};

export const generateIndikatorSoal = async (item: any, apiKey?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Buat 1 indikator soal untuk TP: ${item.tujuanPembelajaran}`
    });
    return response.text?.trim() || "";
  } catch (e) { throw new Error(formatAIError(e)); }
};

export const generateButirSoal = async (item: any, apiKey?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Buat 1 soal SD Kelas ${item.kelas} Indikator: ${item.indikatorSoal}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stimulus: { type: Type.STRING },
            soal: { type: Type.STRING },
            kunci: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (e) { throw new Error(formatAIError(e)); }
};

export const generateJurnalNarasi = async (item: any, matchingRpm: any, apiKey?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Buat narasi jurnal harian materi ${item.materi}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detail_kegiatan: { type: Type.STRING },
            pedagogik: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (e) { throw new Error(formatAIError(e)); }
};
