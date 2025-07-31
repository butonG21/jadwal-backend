import XLSX from 'xlsx';

interface ParsedSchedule {
  employee_id: string;
  name: string;
  department: string;
  position: string;
  schedule: { date: string; shift: string }[];
}

// Map nama bulan dalam bahasa Indonesia (lowercase) ke nomor bulan
const bulanMap: { [key: string]: number } = {
  'januari': 1, 'februari': 2, 'maret': 3, 'april': 4, 'mei': 5, 'juni': 6,
  'juli': 7, 'agustus': 8, 'september': 9, 'oktober': 10, 'november': 11, 'desember': 12
};

export function parseScheduleFromExcel(buffer: Buffer): ParsedSchedule[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const hasil: ParsedSchedule[] = [];
  const currentYearFallback = new Date().getFullYear(); // Fallback jika tahun tidak ditemukan di nama sheet

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    if (!data[2]) continue;

    // --- PERUBAHAN DIMULAI DI SINI ---

    const lowerSheetName = sheetName.toLowerCase();
    
    // 1. Dapatkan bulan dari nama sheet
    const monthName = Object.keys(bulanMap).find(m => lowerSheetName.includes(m));
    if (!monthName) continue; // Lanjut ke sheet berikutnya jika bukan sheet bulan
    const sheetMonth = bulanMap[monthName];

    // 2. Dapatkan tahun dari nama sheet (contoh: "AGUSTUS 2025"), jika tidak ada, gunakan tahun saat ini
    const yearMatch = sheetName.match(/\d{4}/);
    const sheetYear = yearMatch ? parseInt(yearMatch[0], 10) : currentYearFallback;

    // --- AKHIR PERUBAHAN ---

    const headerRow = data[2];
    let maxTanggal = 0;

    // Hitung maksimal tanggal dari header
    for (let t = 1; t <= 31; t++) {
        const colIndex = t + 3; // kolom E = index 4
        if (headerRow[colIndex] !== undefined && String(headerRow[colIndex]).trim() !== '') {
            maxTanggal = t;
        } else if (maxTanggal > 0) { // Berhenti jika menemukan kolom kosong setelah tanggal terisi
            break;
        }
    }

    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      const id = row[1];
      const nama = row[2];
      const posisi = row[3];
      const department = 'Unknown';

      if (!id || !nama || String(nama).toLowerCase() === 'nama lengkap') continue;

      const schedule: { date: string; shift: string }[] = [];

      for (let tgl = 1; tgl <= maxTanggal; tgl++) {
        const colIndex = tgl + 3;
        const shift = row[colIndex];

        if (shift === undefined || String(shift).trim() === '') continue;
        
        // 3. Gunakan bulan dan tahun dari sheet, bukan dari tanggal saat ini
        const date = `${sheetYear}-${String(sheetMonth).padStart(2, '0')}-${String(tgl).padStart(2, '0')}`;
        schedule.push({ date, shift: String(shift) });
      }

      if (schedule.length > 0) {
        hasil.push({
          employee_id: String(id),
          name: String(nama),
          position: String(posisi),
          department,
          schedule
        });
      }
    }
  }

  return hasil;
}