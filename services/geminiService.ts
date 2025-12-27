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

// Menggunakan gemini-3-flash-preview untuk semua tugas agar menghindari limit kuota 429 pada model Pro
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
  TP: "${tp}" | Materi: "${materi}" | Model: "${praktikPedagogis}" | Sesi: ${jumlahPertemuan} pertemuan.
  
  INSTRUKSI KRITIKAL (WAJIB):
  Dalam setiap narasi kegiatan (Awal, Inti, Penutup), Anda WAJIB menyertakan elemen filosofis berikut secara eksplisit:
  1. BERKESADARAN (Mindful): Narasi harus menyebutkan aktivitas yang membangun kesadaran penuh atau kehadiran utuh siswa.
  2. BERMAKNA (Meaningful): Narasi harus menyebutkan keterhubungan materi dengan dunia nyata siswa.
  3. MENGGEMBIRAKAN (Joyful): Narasi harus menyebutkan suasana yang memicu emosi positif atau kegembiraan.

  SANGAT PENTING: Anda HARUS secara harfiah menulis kata 'Berkesadaran', 'Bermakna', dan 'Menggembirakan' di dalam isi teks narasi kegiatan untuk menunjukkan penerapan Deep Learning.
  
  PENTING: Jika pertemuan > 1, tuliskan "Pertemuan 1:", "Pertemuan 2:", dst di awal setiap blok kegiatan.`;
  
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
  const prompt = `Susun 3 rubrik asesmen lengkap (AWAL, PROSES, AKHIR) untuk SD Kelas ${kelas}. 
  TP: "${tp}" | Materi: "${materi}"
  Asesmen awal fokus pada Kesiapan, Proses fokus pada Formatif, Akhir fokus pada Sumatif.`;

  const response = await ai.models.generateContent({
    model: COMPLEX_MODEL,
    contents: prompt,
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
                required: ["aspek", "level4", "level3", "level2", "level1"]
              }
            }
          },
          required: ["kategori", "teknik", "bentuk", "rubrikDetail"]
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
    contents: `Buat konten LKPD SD. Materi: ${rpm.materi}. Fokus: ${rpm.tujuanPembelajaran}.`,
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
  const isNonTes = item.jenis === 'Non Tes';
  const prompt = isNonTes 
    ? `Buat 1 indikator observasi sikap SD. TP: "${item.tujuanPembelajaran}".`
    : `Buat 1 indikator soal AKM SD. TP: "${item.tujuanPembelajaran}".`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt
  });
  return response.text?.trim() || "";
};

export const generateButirSoal = async (item: any, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  const response = await ai.models.generateContent({
    model: COMPLEX_MODEL,
    contents: `Buat 1 butir soal Asesmen SD. TP: "${item.tujuanPembelajaran}". Indikator: ${item.indikatorSoal}`,
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