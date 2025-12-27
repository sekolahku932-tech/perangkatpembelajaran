import { GoogleGenAI, Type } from "@google/genai";
import { UploadedFile } from "../types";

// FIX: Obtain API key exclusively from process.env.API_KEY
const getApiKey = () => {
  return process.env.API_KEY || null;
};

const DEFAULT_MODEL = 'gemini-3-flash-preview';

/**
 * Membuat instance AI baru menggunakan kunci yang tersedia
 */
const createAIInstance = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }
  // FIX: Use named parameter for apiKey during initialization
  return new GoogleGenAI({ apiKey });
};

/**
 * Sistem Retry dengan Exponential Backoff
 */
const withRetry = async <T>(fn: (ai: GoogleGenAI) => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const ai = createAIInstance();
      return await fn(ai);
    } catch (error: any) {
      lastError = error;
      const errorStr = JSON.stringify(error).toLowerCase();
      
      const isQuotaError = errorStr.includes('429') || 
                           errorStr.includes('quota') || 
                           errorStr.includes('resource_exhausted');
      
      if (isQuotaError && i < maxRetries - 1) {
        const delay = Math.pow(2, i + 2) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (errorStr.includes('400') || errorStr.includes('invalid') || errorStr.includes('key not found')) {
        throw new Error('INVALID_API_KEY');
      }

      if (isQuotaError) throw new Error('QUOTA_EXCEEDED');
      throw error;
    }
  }
  throw lastError;
};

/**
 * Inisialisasi Chat
 */
export const startAIChat = async (systemInstruction: string) => {
  const ai = createAIInstance();
  return ai.chats.create({
    model: DEFAULT_MODEL,
    config: { systemInstruction, temperature: 0.7 },
  });
};

/**
 * Analisis Dokumen Multimodal
 */
export const analyzeDocuments = async (files: UploadedFile[], prompt: string) => {
  return withRetry(async (ai) => {
    const fileParts = files.map(file => ({
      inlineData: {
        data: file.base64.split(',')[1],
        mimeType: file.type
      }
    }));

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: {
        parts: [
          ...fileParts,
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: "Anda adalah pakar kurikulum SD. Berikan jawaban yang sangat ringkas dan padat."
      }
    });
    
    // FIX: Use .text property to extract content
    return response.text || "AI tidak memberikan respon teks.";
  });
};

export const analyzeCPToTP = async (cpContent: string, elemen: string, fase: string, kelas: string) => {
  return withRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Pisahkan CP ini menjadi TP linear SD Kelas ${kelas}: "${cpContent}".`,
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
    // FIX: Use .text property
    return JSON.parse(response.text || '[]');
  });
};

export const completeATPDetails = async (tp: string, materi: string, kelas: string) => {
  return withRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Lengkapi ATP secara ringkas. TP: ${tp}.`,
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
    // FIX: Use .text property
    return JSON.parse(response.text || '{}');
  });
};

export const recommendPedagogy = async (tp: string, alurAtp: string, materi: string, kelas: string) => {
  return withRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Rekomendasi model pembelajaran singkat untuk TP: "${tp}"`,
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
    // FIX: Use .text property
    return JSON.parse(response.text || '{}');
  });
};

export const generateRPMContent = async (tp: string, materi: string, kelas: string, praktikPedagogis: string, alokasiWaktu: string, jumlahPertemuan: number = 1) => {
  return withRetry(async (ai) => {
    const prompt = `Buat konten RPM SD Kelas ${kelas} (Deep Learning). 
    TP: "${tp}" | Materi: "${materi}" | Model: "${praktikPedagogis}" | Pertemuan: ${jumlahPertemuan}.

    Format JSON:
    {
      "praktikPedagogis": "Nama Model",
      "kemitraan": "Singkat",
      "lingkunganBelajar": "Singkat",
      "pemanfaatanDigital": "Singkat",
      "kegiatanAwal": "Pertemuan 1:\\n1. ...",
      "kegiatanInti": "Pertemuan 1:\\n1. ...",
      "kegiatanPenutup": "Pertemuan 1:\\n1. ..."
    }`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    // FIX: Use .text property
    return JSON.parse(response.text || '{}');
  });
};

export const generateAssessmentDetails = async (tp: string, materi: string, kelas: string, narasiAwal: string, narasiProses: string, narasiAkhir: string) => {
  return withRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Buat 3 rubrik asesmen singkat untuk TP: "${tp}".`,
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
        },
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    // FIX: Use .text property
    return response.text || "[]";
  });
};

export const generateLKPDContent = async (rpm: any) => {
  return withRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Susun LKPD ringkas. Materi: ${rpm.materi}.`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    // FIX: Use .text property
    return JSON.parse(response.text || '{}');
  });
};

export const generateIndikatorSoal = async (item: any) => {
  return withRetry(async (ai) => {
    const prompt = `Buat 1 kalimat indikator soal AKM jenjang SD. 
    Tujuan Pembelajaran: "${item.tujuanPembelajaran}".
    Level Kognitif: "${item.kompetensi}".
    Bentuk Soal: "${item.bentukSoal}".
    
    INSTRUKSI:
    1. Gunakan Kata Kerja Operasional (KKO) yang sesuai dengan Level Kognitif tersebut.
    2. Sesuaikan bahasa dengan Bentuk Soal yang diminta.
    3. Jawaban hanya berupa 1 kalimat indikator saja.`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    // FIX: Use .text property
    return response.text?.trim() || "";
  });
};

export const generateButirSoal = async (item: any) => {
  return withRetry(async (ai) => {
    const prompt = `Buat 1 butir soal AKM SD yang WAJIB SINKRON TOTAL dengan Indikator Soal berikut:
    Indikator Soal: "${item.indikatorSoal}"
    Bentuk Soal: "${item.bentukSoal}"
    Level Kognitif: "${item.kompetensi}"
    Mata Pelajaran: "${item.mataPelajaran}"

    WAJIB PATUHI ATURAN TEKNIS:
    1. JIKA INDIKATOR MEMINTA "GAMBAR", "SIMBOL", ATAU "DATA":
       - Anda WAJIB membuat TABEL MARKDOWN (2 kolom) di bagian field "stimulus".
       - Contoh: Jika diminta gambar simbol Pancasila, buat tabel berisi Deskripsi Visual (Contoh: "Simbol Rantai Emas") dan Keterangan (Contoh: "Latar belakang merah").
    2. JIKA BENTUK SOAL ADALAH "MENJODOHKAN":
       - Field "soal" WAJIB berisi TABEL MARKDOWN dengan dua kolom: Kolom A (Pertanyaan/Gambar) dan Kolom B (Pilihan Jawaban).
    3. TEKS BACAAN: Tetap buat narasi/wacana yang mendalam minimal 2 paragraf sebelum tabel (jika ada).
    4. DILARANG menggunakan kata 'stimulus' di dalam teks output.

    WAJIB DALAM JSON:
    {
      "stimulus": "Narasi bacaan DAN Tabel Markdown representasi visual/data",
      "soal": "Pertanyaan lengkap (Sertakan Tabel jika tipe Menjodohkan)",
      "kunci": "Kunci jawaban yang akurat"
    }`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stimulus: { type: Type.STRING },
            soal: { type: Type.STRING },
            kunci: { type: Type.STRING }
          },
          required: ['stimulus', 'soal', 'kunci']
        }
      }
    });
    
    // FIX: Use .text property
    return JSON.parse(response.text || '{"stimulus": "", "soal": "", "kunci": ""}');
  });
};
