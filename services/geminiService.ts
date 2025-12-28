
import { GoogleGenAI, Type } from "@google/genai";
import { UploadedFile } from "../types";

// Fungsi pembantu untuk membersihkan string dari blok kode markdown
const cleanJsonString = (str: string): string => {
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

const getApiKey = (customKey?: string) => {
  const key = customKey || process.env.API_KEY;
  if (!key) throw new Error('API_KEY_MISSING');
  return key;
};

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const COMPLEX_MODEL = 'gemini-3-flash-preview'; 

export const startAIChat = async (systemInstruction: string, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  return ai.chats.create({
    model: DEFAULT_MODEL,
    config: { systemInstruction, temperature: 0.7 },
  });
};

export const analyzeDocuments = async (files: UploadedFile[], prompt: string, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  const fileParts = files.map(file => ({
    inlineData: {
      data: file.base64.split(',')[1],
      mimeType: file.type
    }
  }));
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: { parts: [...fileParts, { text: prompt }] },
    config: { systemInstruction: "Pakar kurikulum SD SDN 5 Bilato. Jawaban ringkas." }
  });
  return response.text || "AI tidak memberikan respon.";
};

export const analyzeCPToTP = async (cpContent: string, elemen: string, fase: string, kelas: string, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Analisis CP ini menjadi TP linear untuk SD Kelas ${kelas}: "${cpContent}".`,
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
        }
      }
    }
  });
  return JSON.parse(cleanJsonString(response.text || '[]'));
};

export const completeATPDetails = async (tp: string, materi: string, kelas: string, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  const response = await ai.models.generateContent({
    model: COMPLEX_MODEL,
    contents: `Lengkapi detail ATP SD Kelas ${kelas}. TP: "${tp}" | Materi: "${materi}"`,
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
};

export const recommendPedagogy = async (tp: string, alurAtp: string, materi: string, kelas: string, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Berikan 1 nama model pembelajaran paling relevan untuk TP SD: "${tp}"`,
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
};

export const generateRPMContent = async (tp: string, materi: string, kelas: string, praktikPedagogis: string, alokasiWaktu: string, jumlahPertemuan: number = 1, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  const prompt = `Susun langkah pembelajaran mendalam 3M (Memahami, Mengaplikasi, Merefleksi) untuk SD Kelas ${kelas}.
  TP: "${tp}" | Materi: "${materi}" | Model: "${praktikPedagogis}" | Sesi: ${jumlahPertemuan} pertemuan.`;
  
  const response = await ai.models.generateContent({
    model: COMPLEX_MODEL,
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
        },
        required: ["kegiatanAwal", "kegiatanInti", "kegiatanPenutup"]
      }
    }
  });
  return JSON.parse(cleanJsonString(response.text || '{}'));
};

export const generateAssessmentDetails = async (tp: string, materi: string, kelas: string, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  const response = await ai.models.generateContent({
    model: COMPLEX_MODEL,
    contents: `Susun 3 rubrik asesmen (AWAL, PROSES, AKHIR) untuk SD: TP "${tp}"`,
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
  return cleanJsonString(response.text || '[]');
};

export const generateLKPDContent = async (rpm: any, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  const response = await ai.models.generateContent({
    model: COMPLEX_MODEL,
    contents: `Buat LKPD SD. Materi: ${rpm.materi}.`,
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
};

export const generateIndikatorSoal = async (item: any, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  
  const prompt = `Berikan HANYA teks murni satu paragraf indikator soal AKM SD. 
    DILARANG menyertakan metadata, label, atau ulasan tambahan. 
    Format WAJIB: "Disajikan..., peserta didik dapat...".
    Context: TP "${item.tujuanPembelajaran}", Level "${item.kompetensi}", Bentuk "${item.bentukSoal}".`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: { temperature: 0.1 }
  });
  return response.text?.trim() || "";
};

export const generateButirSoal = async (item: any, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  
  const prompt = `Buatlah 1 butir soal asesmen SD. 
    Indikator: "${item.indikatorSoal}"
    BENTUK SOAL WAJIB: "${item.bentukSoal}"

    ATURAN KETAT:
    1. STIMULUS: Jika indikator menyebutkan tabel/gambar/teks, buat tabel Markdown (| Kolom |) yang rapi. 
       - Pisahkan baris kosong sebelum dan sesudah tabel.
       - Jika teks Arab, tulis dengan harakat lengkap.
    
    2. SOAL & PILIHAN: 
       - DILARANG MENGGUNAKAN KATA "STIMULUS" dalam teks pertanyaan. Gunakan "tabel di atas", "bacaan tersebut", atau "kalimat di atas".
       - Jika PILIHAN GANDA: Susun opsi A, B, C, D SECARA VERTIKAL (satu baris satu opsi, diawali huruf kapital dan titik).
       - Jika MENJODOHKAN: Sajikan tabel pasangan yang menantang.
       - Jika ISIAN/URAIAN: Berikan perintah yang jelas.

    3. KUNCI: Berikan huruf atau jawaban murni saja.

    Output dalam JSON field: stimulus, soal, kunci.`;

  const response = await ai.models.generateContent({
    model: COMPLEX_MODEL,
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
  return JSON.parse(cleanJsonString(response.text || '{}'));
};
