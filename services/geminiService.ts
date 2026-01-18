
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
    config: { systemInstruction: "Pakar kurikulum SD SDN SONDANA. Fokus pada Kurikulum Merdeka Fase C Kelas 5. Jawaban ringkas." }
  });
  return response.text || "AI tidak memberikan respon.";
};

export const analyzeCPToTP = async (cpContent: string, elemen: string, fase: string, kelas: string, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Analisis CP ini menjadi TP linear untuk SD Kelas 5 (Fase C): "${cpContent}".`,
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
  
  const prompt = `Lengkapi detail ATP SD Kelas 5 (Fase C). TP: "${tp}" | Materi: "${materi}".
  
  ATURAN DIMENSI PROFIL:
  Gunakan HANYA kombinasi dari 8 dimensi berikut untuk field 'dimensiOfProfil':
  1. Keimanan & Ketakwaan
  2. Kewargaan
  3. Penalaran Kritis
  4. Kreativitas
  5. Kolaborasi
  6. Kemandirian
  7. Kesehatan
  8. Komunikasi`;

  const response = await ai.models.generateContent({
    model: COMPLEX_MODEL,
    contents: prompt,
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
    contents: `Berikan 1 nama model pembelajaran paling relevan untuk TP SD Kelas 5: "${tp}"`,
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
  
  const prompt = `Susun Rencana Pembelajaran Mendalam (RPM) yang sangat urai untuk SD Kelas 5 (Fase C).
  MATERI: "${materi}"
  TUJUAN: "${tp}"
  DURASI: ${jumlahPertemuan} pertemuan.

  WAJIB: Setiap langkah (Awal, Inti, Penutup) harus mengandung TIGA UNSUR berikut sekaligus:
  1. BERKESADARAN (Mindful): Aktivitas yang membangun kehadiran utuh dan fokus siswa.
  2. BERMAKNA (Meaningful): Aktivitas yang menghubungkan materi dengan kehidupan nyata di Gorontalo/Bilato.
  3. MENGGEMBIRAKAN (Joyful): Aktivitas interaktif yang memicu kegembiraan dan motivasi belajar.

  STRUKTUR OUTPUT (Tulis dalam format poin-poin linear untuk setiap pertemuan):
  - Kegiatan Awal (Memahami): Fokus pada koneksi berkesadaran, motivasi bermakna, dan pembukaan yang menggembirakan.
  - Kegiatan Inti (Mengaplikasi): Fokus pada aksi nyata yang menantang, kerja sama bermakna, dan proses eksplorasi berkesadaran yang menyenangkan.
  - Kegiatan Penutup (Merefleksi): Fokus pada perayaan pencapaian, refleksi batin berkesadaran, dan penutupan yang menggembirakan.

  Instruksi Narasi: Gunakan penanda [Berkesadaran], [Bermakna], atau [Menggembirakan] di akhir kalimat yang merepresentasikan unsur tersebut.
  Hasilkan respon dalam JSON.`;
  
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
    contents: `Susun 3 rubrik asesmen (AWAL, PROSES, AKHIR) untuk SD Kelas 5: TP "${tp}"`,
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
  const count = rpm.jumlahPertemuan || 1;
  
  const prompt = `Buat konten Lembar Kerja Peserta Didik (LKPD) SD Kelas 5 Fase C secara LENGKAP untuk ${count} pertemuan.
  Materi: "${rpm.materi}"
  Tujuan Pembelajaran: "${rpm.tujuanPembelajaran}"
  Fase/Kelas: Fase C/Kelas 5
  Model Pembelajaran: ${rpm.praktikPedagogis}

  INSTRUKSI WAJIB:
  1. Karena LKPD ini untuk ${count} pertemuan, Anda HARUS memberikan rincian untuk SETIAP pertemuan di field 'materiRingkas', 'langkahKerja', 'tugasMandiri', dan 'refleksi'.
  2. Gunakan penanda teks "Pertemuan 1:", "Pertemuan 2:", dst. di awal setiap blok teks pertemuan dalam field tersebut.
  3. Pastikan tugas dan langkah kerja berkembang kesulitannya dari pertemuan awal hingga akhir.
  4. 'petunjuk' berisi instruksi umum untuk seluruh pengerjaan LKPD.`;

  const response = await ai.models.generateContent({
    model: COMPLEX_MODEL,
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
        },
        required: ["petunjuk", "materiRingkas", "langkahKerja", "tugasMandiri", "refleksi"]
      }
    }
  });
  return JSON.parse(cleanJsonString(response.text || '{}'));
};

export const generateIndikatorSoal = async (item: any, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  
  const prompt = `Berikan HANYA teks murni satu paragraf indikator soal AKM SD untuk Kelas 5. 
    DILARANG menyertakan metadata, label, atau ulasan tambahan. 
    Format WAJIB: "Disajikan..., peserta didik dapat...".
    Context: TP "${item.tujuanPembelajaran}", Level "${item.kompetensi}", Bentuk "${item.bentukSoal}".
    Tingkat kesulitan bahasa HARUS sesuai untuk anak SD Kelas 5.`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: { temperature: 0.1 }
  });
  return response.text?.trim() || "";
};

export const generateButirSoal = async (item: any, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  
  const prompt = `Buatlah 1 butir soal asesmen SD Kelas 5. 
    Indikator: "${item.indikatorSoal}"
    LEVEL KOGNITIF: "${item.kompetensi}"
    BENTUK SOAL: "${item.bentukSoal}"

    ATURAN FORMAT WAJIB (PATEN):
    1. STIMULUS: Jika indikator menyebutkan tabel/gambar/teks, buat tabel Markdown (| Kolom |) yang rapi. 
       Gunakan sel pembuka dan penutup pipa (|) pada SETIAP baris tabel tanpa kecuali.
    2. PILIHAN GANDA: 
       - WAJIB disusun ke bawah (VERTIKAL).
       - Satu baris HANYA berisi SATU opsi.
       - Contoh Format:
         A. Opsi satu
         B. Opsi dua
         C. Opsi tiga
         D. Opsi empat
       - DILARANG KERAS menggabungkan opsi dalam satu baris (Contoh: A. x B. y -> INI DILARANG).
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
