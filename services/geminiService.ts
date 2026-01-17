
import { GoogleGenAI, Type } from "@google/genai";
import { UploadedFile } from "../types";

// Fungsi pembantu untuk membersihkan string dari blok kode markdown
const cleanJsonString = (str: string): string => {
  if (!str) return '';
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

const getApiKey = (customKey?: string) => {
  if (customKey && customKey.trim().length > 5) {
    return customKey.trim();
  }
  const envKey = process.env.API_KEY;
  if (envKey && envKey !== 'undefined' && envKey.length > 5) {
    return envKey;
  }
  throw new Error('API_KEY_MISSING');
};

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const COMPLEX_MODEL = 'gemini-3-pro-preview'; 

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
    model: DEFAULT_MODEL,
    contents: `Lengkapi detail ATP SD Kelas ${kelas}. TP: "${tp}" | Materi: "${materi}".`,
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
  const prompt = `Susun Rencana Pembelajaran Mendalam (RPM) SD Kelas ${kelas} SANGAT DETAIL. TP: "${tp}", Materi: "${materi}". JUMLAH PERTEMUAN: ${jumlahPertemuan}.`;
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
        }
      }
    }
  });
  return JSON.parse(cleanJsonString(response.text || '{}'));
};

export const generateAssessmentDetails = async (tp: string, materi: string, kelas: string, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Susun 3 jenis instrumen asesmen LENGKAP untuk SD Kelas ${kelas}. TP: "${tp}".`,
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
};

export const generateLKPDContent = async (rpm: any, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  const prompt = `Buatlah LKPD SD untuk ${rpm.jumlahPertemuan} PERTEMUAN dari TP: "${rpm.tujuanPembelajaran}".`;
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
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
  const prompt = `Buatlah 1 kalimat Indikator Soal SD Kelas ${item.kelas} untuk TP: "${item.tujuanPembelajaran}".`;
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt
  });
  return response.text?.trim() || "";
};

export const generateButirSoal = async (item: any, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  
  const prompt = `Buatlah 1 butir soal SD Kelas ${item.kelas} berdasarkan Indikator: "${item.indikatorSoal}".
  Bentuk Soal: "${item.bentukSoal}"

  ATURAN FORMAT WAJIB (KESALAHAN FORMAT AKAN MERUSAK TAMPILAN):
  1. Jika bentuk adalah 'Pilihan Ganda' (Tunggal):
     - Gunakan label A, B, C, D. (HANYA 4 PILIHAN).
     - Format: A. Teks pilihan ... B. Teks pilihan ...
  2. Jika bentuk adalah 'Pilihan Ganda Kompleks (Multiple Choice)':
     - Gunakan kotak ceklis [ ] di depan setiap pilihan.
     - JANGAN GUNAKAN LABEL HURUF (A, B, C, dst).
     - Tambahkan instruksi "Berilah tanda centang (✓) pada setiap pernyataan yang benar!".
  3. Jika bentuk adalah 'Pilihan Ganda Kompleks' dengan sub-tipe 'Benar-Salah', 'Ya-Tidak', atau 'Setuju-Tidak Setuju':
     - WAJIB gunakan TABEL Markdown.
     - Kolom tabel: | Pernyataan | [Pilihan 1] | [Pilihan 2] |.
     - Contoh untuk Ya-Tidak: | Pernyataan | Ya | Tidak |.
     - Sertakan minimal 3-4 baris pernyataan untuk tabel tersebut.
  4. Jika bentuk adalah 'Menjodohkan':
     - Buatlah daftar pasangan yang harus dijodohkan.
     - WAJIB gunakan tabel Markdown dengan 2 kolom: | Pernyataan | Jawaban Pasangan |.
     - Tambahkan instruksi "Pasangkanlah pernyataan di sebelah kiri dengan jawaban yang tepat di sebelah kanan dengan menarik garis!".
     - Acak urutan di kolom kanan agar tidak langsung sejajar dengan kolom kiri.
  5. Jika bentuk 'Isian', buat kalimat rumpang diakhiri titik-titik panjang ..........
  6. Stimulus: Jika indikator meminta penyajian data/teks, buatlah narasi teks atau tabel Markdown yang mendalam di field 'stimulus'.
  
  PENTING: Output JSON.`;

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
        }
      }
    }
  });
  return JSON.parse(cleanJsonString(response.text || '{}'));
};

export const generateJurnalNarasi = async (item: any, matchingRpm: any, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Bantu susun narasi jurnal harian guru SD Kelas ${item.kelas} Mapel ${item.mataPelajaran} materi ${item.materi}.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(cleanJsonString(response.text || '{}'));
};
