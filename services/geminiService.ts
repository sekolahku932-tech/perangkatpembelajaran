
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Variabel internal untuk menyimpan kunci yang diambil dari Firebase atau LocalStorage
 */
let dynamicApiKey: string | null = null;

export const setGeminiKey = (key: string) => {
  if (key && key.trim() !== '') {
    dynamicApiKey = key.trim();
  }
};

const getApiKey = () => {
  if (dynamicApiKey) return dynamicApiKey;
  const storedKey = localStorage.getItem('GEMINI_API_KEY');
  if (storedKey && storedKey.trim() !== '') return storedKey;
  const envKey = process.env.API_KEY || (window as any).process?.env?.API_KEY;
  if (envKey && envKey !== 'undefined' && envKey !== '') return envKey;
  return null;
};

/**
 * MENGGUNAKAN GEMINI 1.5 FLASH LATEST
 * Model ini adalah yang paling stabil dan memiliki kuota gratis paling longgar 
 * (15 RPM / 1500 RPD) dibandingkan model versi 3 yang masih sangat dibatasi.
 */
const DEFAULT_MODEL = 'gemini-1.5-flash-latest';

const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Sistem Retry dengan Jeda yang lebih cerdas (Exponential Backoff)
 * Jika gagal 429, ia akan menunggu 2 detik, lalu 4 detik, lalu 8 detik.
 */
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorStr = JSON.stringify(error).toLowerCase();
      const isQuotaError = errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('resource_exhausted');
      
      if (isQuotaError && i < maxRetries - 1) {
        // Tunggu lebih lama setiap kali gagal (2s, 4s, 8s)
        const delay = Math.pow(2, i + 1) * 1000;
        console.warn(`Kuota API habis. Mencoba lagi dalam ${delay}ms... (Percobaan ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

const handleGeminiError = (error: any) => {
  console.error("AI Service Log:", error);
  const errorStr = JSON.stringify(error).toLowerCase();
  
  if (errorStr.includes('api key not found') || errorStr.includes('invalid')) {
    throw new Error('API_KEY_MISSING');
  }
  
  if (errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('resource_exhausted')) {
    throw new Error('QUOTA_EXCEEDED');
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
  return withRetry(async () => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `Analisis CP: "${cpContent}". Pisahkan menjadi urutan TP linear untuk SD Kelas ${kelas}.`,
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
  });
};

export const completeATPDetails = async (tp: string, materi: string, kelas: string) => {
  return withRetry(async () => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `Lengkapi ATP. Materi: ${materi}, TP: ${tp}. SD Kelas ${kelas}.`,
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
      return JSON.parse(response.text?.trim() || '{}');
    } catch (error: any) {
      return handleGeminiError(error);
    }
  });
};

export const recommendPedagogy = async (tp: string, alurAtp: string, materi: string, kelas: string) => {
  return withRetry(async () => {
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
            }
          }
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (error: any) {
      return handleGeminiError(error);
    }
  });
};

export const generateRPMContent = async (tp: string, materi: string, kelas: string, praktikPedagogis: string, alokasiWaktu: string, jumlahPertemuan: number = 1) => {
  return withRetry(async () => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `Susun RPM SD Kelas ${kelas}. TP: ${tp}. Materi: ${materi}. Model: ${praktikPedagogis}.`,
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
            }
          }
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (error: any) {
      return handleGeminiError(error);
    }
  });
};

export const generateAssessmentDetails = async (tp: string, materi: string, kelas: string, narasiAwal: string, narasiProses: string, narasiAkhir: string) => {
  return withRetry(async () => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `Buat 3 rubrik asesmen lengkap (AWAL, PROSES, AKHIR) untuk TP: "${tp}" SD Kelas ${kelas}.`,
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
  });
};

export const generateLKPDContent = async (rpm: any) => {
  return withRetry(async () => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `Susun LKPD. Topik: ${rpm.materi}. SD Kelas ${rpm.kelas}.`,
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
  });
};

export const generateIndikatorSoal = async (item: any) => {
  return withRetry(async () => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `Buatkan 1 kalimat indikator soal AKM SD. Mapel: ${item.mataPelajaran}, Kelas: ${item.kelas}, TP: ${item.tujuanPembelajaran}. Berikan kalimatnya saja.`,
      });
      return response.text?.trim() || "";
    } catch (error) {
      return handleGeminiError(error);
    }
  });
};

export const generateButirSoal = async (item: any) => {
  return withRetry(async () => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `Buatkan 1 butir soal AKM SD Kelas ${item.kelas}. Indikator: ${item.indikatorSoal}, Bentuk: ${item.bentukSoal}. Format: SOAL: [Isi] KUNCI: [Jawaban].`,
      });
      const fullText = response.text || "";
      const soalPart = fullText.match(/SOAL:([\s\S]*?)KUNCI:/i)?.[1]?.trim() || fullText;
      const kunciPart = fullText.match(/KUNCI:([\s\S]*)/i)?.[1]?.trim() || "";
      return { soal: soalPart, kunci: kunciPart };
    } catch (error) {
      return handleGeminiError(error);
    }
  });
};
