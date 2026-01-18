
import { GoogleGenAI, Type } from "@google/genai";
import { UploadedFile } from "../types";

/**
 * PENTING: Aplikasi ini menggunakan model FLASH 3 PREVIEW.
 * Model ini memiliki kuota gratis (Free Tier) yang jauh lebih besar dan stabil
 * dibandingkan versi Pro yang sering terkena batasan 'Limit 0'.
 */
const MODEL_NAME = 'gemini-3-flash-preview';

// Fungsi pembantu untuk membersihkan string dari blok kode markdown
const cleanJsonString = (str: string): string => {
  if (!str) return '';
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * Memformat pesan error dari AI agar lebih mudah dibaca oleh guru
 */
const formatAIError = (error: any): string => {
  console.error("Gemini API Error Detail:", error);
  const errorStr = typeof error === 'string' ? error : (error?.message || "");
  
  if (errorStr === 'API_KEY_REQUIRED') {
    return "AKSES DITOLAK: Anda belum memasukkan API Key pribadi di menu Profil. Fitur AI tidak dapat dijalankan tanpa kunci Anda sendiri.";
  }

  if (errorStr.includes('429') || errorStr.includes('QUOTA_EXCEEDED') || errorStr.includes('RESOURCE_EXHAUSTED')) {
    return "KUOTA ANDA HABIS: Batas penggunaan gratis pada API Key Anda telah tercapai. Silakan coba lagi dalam 1 menit atau gunakan kunci lain.";
  }
  
  if (errorStr.includes('403') || errorStr.includes('API_KEY_INVALID')) {
    return "KUNCI TIDAK VALID: API Key yang Anda masukkan di Profil salah atau tidak aktif. Silakan ambil ulang kunci dari Google AI Studio.";
  }

  return `GANGGUAN SISTEM: ${errorStr}`;
};

/**
 * LOGIKA PENGUNCIAN TOTAL:
 * Fungsi ini HANYA akan mengembalikan kunci jika customKey tersedia.
 * Tidak ada lagi pengambilan process.env.API_KEY untuk fitur perangkat guru.
 */
const getApiKey = (customKey?: string) => {
  if (customKey && typeof customKey === 'string' && customKey.trim().length > 10) {
    return customKey.trim();
  }
  
  // Jika tidak ada kunci kustom, lempar error khusus
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
      inlineData: {
        data: file.base64.split(',')[1],
        mimeType: file.type
      }
    }));
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts: [...fileParts, { text: prompt }] },
      config: { systemInstruction: "Pakar kurikulum SD. Berikan analisis ringkas." }
    });
    return response.text || "AI tidak memberikan respon.";
  } catch (e) { throw new Error(formatAIError(e)); }
};

export const analyzeCPToTP = async (cpContent: string, elemen: string, fase: string, kelas: string, apiKey?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analisis CP ini menjadi TP untuk SD Kelas ${kelas}: "${cpContent}".`,
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
      contents: `Lengkapi ATP SD Kelas ${kelas}. TP: "${tp}" | Materi: "${materi}".`,
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
      contents: `Berikan model pembelajaran untuk TP: "${tp}"`,
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
    const prompt = `Susun RPM SD Kelas ${kelas}. TP: "${tp}", Materi: "${materi}".`;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
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
      contents: `Susun asesmen untuk TP: "${tp}".`,
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
      contents: `Buat LKPD dari TP: "${rpm.tujuanPembelajaran}".`,
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
      contents: `Buat indikator soal untuk: "${item.tujuanPembelajaran}".`
    });
    return response.text?.trim() || "";
  } catch (e) { throw new Error(formatAIError(e)); }
};

export const generateButirSoal = async (item: any, apiKey?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
    const prompt = `Buat soal SD Kelas ${item.kelas} Indikator: "${item.indikatorSoal}" Bentuk: "${item.bentukSoal}".`;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
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
      contents: `Narasi jurnal SD Kelas ${item.kelas} materi ${item.materi}.`,
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
