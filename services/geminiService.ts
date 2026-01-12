
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
  const prompt = `Lengkapi detail ATP SD Kelas ${kelas}. TP: "${tp}" | Materi: "${materi}".
  Gunakan 8 dimensi profil: Keimanan, Kewargaan, Penalaran Kritis, Kreativitas, Kolaborasi, Kemandirian, Kesehatan, Komunikasi.`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
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
  const prompt = `Susun Rencana Pembelajaran Mendalam (RPM) SD Kelas ${kelas} DETAIL. 
  TP: "${tp}", Materi: "${materi}". 
  BUAT UNTUK ${jumlahPertemuan} PERTEMUAN.
  Gunakan header 'Pertemuan 1:', 'Pertemuan 2:', dst di setiap field kegiatan. 
  Struktur 3M.`;
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
    contents: `Susun 3 jenis instrumen asesmen LENGKAP (AWAL, PROSES, AKHIR) untuk SD Kelas ${kelas}. 
    TP: "${tp}".
    Materi: "${materi}".

    INSTRUKSI KHUSUS FORMAT:
    1. Pada field 'soalAtauTugas', Anda WAJIB menyusun daftar butir soal atau instruksi tugas secara VERTIKAL KE BAWAH menggunakan penomoran (1. ..., 2. ..., 3. ... dst).
    2. Setiap butir soal HARUS dipisahkan oleh baris baru (newline) agar mudah dibaca.
    3. Jika teknik adalah Tes Tertulis, buat minimal 5-10 soal yang variatif dan operasional sesuai level kelas siswa.
    4. Pada field 'rubrikDetail', berikan kriteria penilaian untuk 4 level secara mendalam.`,
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            kategori: { type: Type.STRING, description: "AWAL / PROSES / AKHIR" },
            teknik: { type: Type.STRING },
            bentuk: { type: Type.STRING },
            instruksi: { type: Type.STRING, description: "Instruksi umum pengerjaan" },
            soalAtauTugas: { type: Type.STRING, description: "Daftar butir soal atau tugas yang disusun vertikal berurutan kebawah (1, 2, 3...)" },
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
          },
          required: ["kategori", "teknik", "bentuk", "soalAtauTugas", "rubrikDetail"]
        }
      }
    }
  });
  return cleanJsonString(response.text || '[]');
};

export const generateLKPDContent = async (rpm: any, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  
  const refAwal = rpm.kegiatanAwal || "";
  const refInti = rpm.kegiatanInti || "";
  const refPenutup = rpm.kegiatanPenutup || "";
  const refAsesmen = rpm.asesmenTeknik || "";
  const count = rpm.jumlahPertemuan || 1;

  const prompt = `Buatlah Lembar Kerja Peserta Didik (LKPD) SD untuk ${count} PERTEMUAN yang MENYELARASKAN data dari RPM berikut:
  
  TP: "${rpm.tujuanPembelajaran}"
  Materi: "${rpm.materi}"
  
  REFERENSI LANGKAH 3M (Dari RPM):
  1. Memahami: ${refAwal}
  2. Mengaplikasi: ${refInti}
  3. Merefleksi: ${refPenutup}
  
  REFERENSI ASESMEN:
  ${refAsesmen}

  INSTRUKSI KHUSUS MULTI-PERTEMUAN:
  1. Karena ada ${count} pertemuan, Anda WAJIB menyusun konten untuk SETIAP pertemuan secara berurutan.
  2. Gunakan awalan 'Pertemuan 1:', 'Pertemuan 2:', dst. di DALAM setiap field string (materiRingkas, langkahKerja, tugasMandiri, refleksi).
  3. MATERI_RINGKAS: Adaptasi dari bagian 'Memahami' per pertemuan.
  4. LANGKAH_KERJA: Adaptasi dari bagian 'Mengaplikasi' per pertemuan.
  5. TUGAS_MANDIRI: Distribusikan butir soal/instrumen asesmen ke setiap pertemuan secara proporsional (Misal: Soal 1-5 di Pertemuan 1, Soal 6-10 di Pertemuan 2).
  6. REFLEKSI: Adaptasi dari bagian 'Merefleksi' per pertemuan.`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          petunjuk: { type: Type.STRING, description: "Petunjuk umum belajar" },
          materiRingkas: { type: Type.STRING, description: "Konten per pertemuan diawali label 'Pertemuan X:'" },
          langkahKerja: { type: Type.STRING, description: "Konten per pertemuan diawali label 'Pertemuan X:'" },
          tugasMandiri: { type: Type.STRING, description: "Konten per pertemuan diawali label 'Pertemuan X:'" },
          refleksi: { type: Type.STRING, description: "Konten per pertemuan diawali label 'Pertemuan X:'" }
        }
      }
    }
  });
  return JSON.parse(cleanJsonString(response.text || '{}'));
};

export const generateIndikatorSoal = async (item: any, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  
  const prompt = `Buatlah 1 kalimat Indikator Soal standar kurikulum untuk SD Kelas ${item.kelas}.
  TP: "${item.tujuanPembelajaran}"
  Level Kognitif: "${item.kompetensi}"
  Bentuk Soal: "${item.bentukSoal}"

  FORMAT WAJIB (Gunakan Kata Kerja Operasional yang tepat):
  "Disajikan [teks bacaan/gambar/tabel/data/ilustrasi], peserta didik dapat [kata kerja operasional sesuai level] [materi spesifik] dengan benar."

  Hanya berikan hasil kalimat indikatornya saja. Jangan gunakan kata 'stimulus'.`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt
  });
  return response.text?.trim() || "";
};

export const generateButirSoal = async (item: any, apiKey?: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  
  const prompt = `Buatlah 1 butir soal SD Kelas ${item.kelas} berdasarkan Indikator: "${item.indikatorSoal}".
  Level Kognitif: "${item.kompetensi}"
  Bentuk Soal: "${item.bentukSoal}"

  INSTRUKSI KHUSUS FORMAT NARASI & VISUAL:
  1. Jika bentuk 'Isian', Anda WAJIB membuat kalimat PERNYATAAN RUMPANG yang diakhiri titik-titik panjang. 
     JANGAN GUNAKAN kalimat tanya seperti 'Berapakah...', 'Siapakah...'. 
     Contoh yang BENAR: 'Jumlah bunga mawar yang dimiliki Siti adalah ..........'
  2. Jika bentuk 'Pilihan Ganda Kompleks', Anda WAJIB memilih salah satu sub-tipe ini:
     - TIPE BENAR-SALAH: Di field 'soal', buatlah tabel Markdown dengan kolom | Pernyataan | Benar | Salah |. Tambahkan instruksi "Berilah tanda centang (✓) pada kolom yang sesuai!".
     - TIPE MULTI-SELECT: Di field 'soal', buatlah 5 pilihan (A, B, C, D, E) dengan kotak ceklis "[ ]" di depannya. Tambahkan instruksi "Pilihlah lebih dari satu jawaban yang benar!".
  3. Jika bentuk 'Menjodohkan', buatlah tabel Markdown dengan 3 kolom: | Pernyataan (Kiri) | | Pilihan Jawaban (Kanan) |. 
     - Kolom tengah HARUS dibiarkan kosong (atau beri titik-titik) untuk tempat menarik garis. 
     - Pilihan jawaban di lajur kanan HARUS diacak (tidak linear dengan kiri).
     - Tambahkan instruksi "Tariklah garis lurus untuk menghubungkan pernyataan di kiri dengan jawaban di kanan yang tepat!".
  4. TEKS/BACAAN/TABEL: Wajib buat teks bacaan atau tabel data di field 'stimulus' (isi teknis) sesuai yang diminta indikator.
  5. KUNCI: Berikan jawaban yang tepat.

  CATATAN PENTING: Dalam narasi soal, jangan pernah gunakan kata 'stimulus'. Gunakan kata 'teks', 'bacaan', 'gambar', atau 'tabel'.
  Output JSON.`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          stimulus: { type: Type.STRING, description: "Teks atau Tabel pendukung (Bahan bacaan)" },
          soal: { type: Type.STRING, description: "Pertanyaan, Pernyataan Rumpang, Tabel, atau Pilihan Ganda" },
          kunci: { type: Type.STRING, description: "Jawaban benar" }
        }
      }
    }
  });
  return JSON.parse(cleanJsonString(response.text || '{}'));
};
