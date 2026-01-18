
import { GoogleGenAI, Type } from "@google/genai";
import { UploadedFile } from "../types";

/**
 * SDN 5 Bilato - Engine V3.5 (Recovery Engine)
 * Penanda Unik Update: 2025-05-22_T10:00 (Cache Buster)
 * Kami beralih ke gemini-flash-lite-latest untuk stabilitas maksimum.
 */
const MODEL_NAME = 'gemini-flash-lite-latest';

const cleanJsonString = (str: string): string => {
  if (!str) return '';
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

const logRequestInfo = (customKey?: string) => {
  const maskedKey = customKey ? `${customKey.substring(0, 6)}...${customKey.substring(customKey.length - 4)}` : 'MISSING';
  console.info(`[V3.5 ACTIVE] Menggunakan Jalur: ${MODEL_NAME}`);
  console.info(`[V3.5 ACTIVE] Kunci Terdeteksi: ${maskedKey}`);
};

const formatAIError = (error: any): string => {
  const errorStr = JSON.stringify(error).toUpperCase();
  console.error("DEBUG ERROR V3.5:", error);

  if (errorStr.includes('429') || errorStr.includes('QUOTA')) {
    return "KUOTA HARIAN HABIS: Batas gratis API Key Anda sudah tercapai. Silakan coba lagi besok atau gunakan API Key baru.";
  }
  
  if (errorStr.includes('PRO') || errorStr.includes('GEMINI-3') || errorStr.includes('LIMIT: 0')) {
    return "LOGIKA ERROR (CACHE): Browser Anda masih memanggil mesin PRO yang mati. WAJIB TEKAN CTRL + F5 SEKARANG JUGA.";
  }

  return `GANGGUAN TEKNIS: (Error: ${errorStr.substring(0, 50)}...)`;
};

const getApiKey = (customKey?: string) => {
  const key = customKey?.trim();
  if (key && key.length > 20) {
    logRequestInfo(key);
    return key;
  }
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
      contents: `Susun RPM SD Kelas ${kelas} materi ${materi} untuk TP: ${tp}. Model: ${praktikPedagogis}`,
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
