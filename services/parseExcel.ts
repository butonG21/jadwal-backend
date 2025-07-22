import XLSX from 'xlsx';

interface ParsedSchedule {
    employee_id: string;
    name: string;
    department: string;
    position: string;
    schedule: { date: string; shift: string }[];
}

const bulanMap = [
    '', 'januari', 'februari', 'maret', 'april', 'mei', 'juni',
    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
];

export function parseScheduleFromExcel(buffer: Buffer): ParsedSchedule[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const hasil: ParsedSchedule[] = [];

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const bulanMap = [
        '', 'januari', 'februari', 'maret', 'april', 'mei', 'juni',
        'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
    ];
    const currentMonthName = bulanMap[currentMonth];

    for (const sheetName of workbook.SheetNames) {
        const ws = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
        if (!data[2]) continue;

        const barisBulan = data[1]; // Baris yang mengandung nama bulan (biasanya baris 2)
        const headerRow = data[2];

        // Cari indeks awal kolom untuk bulan saat ini
        let mulaiIndex = -1;
        for (let i = 0; i < barisBulan.length; i++) {
            const cell = (barisBulan[i] || '').toLowerCase().replace(/\s+/g, '');
            if (cell.includes(currentMonthName)) {
                mulaiIndex = i;
                break;
            }
        }

        if (mulaiIndex === -1) {
            console.warn(`❌ Tidak menemukan bulan "${currentMonthName}" di baris 2`);
            continue;
        }

        // Ambil maksimum 31 kolom ke depan dari kolom bulan yang ditemukan
        const tanggalKolomIndex: { tgl: number; kolomIndex: number }[] = [];
        for (let offset = 0; offset < 31; offset++) {
            const colIndex = mulaiIndex + offset;
            const val = headerRow[colIndex];
            const tglNum = parseInt(String(val));
            if (!isNaN(tglNum) && tglNum >= 1 && tglNum <= 31) {
                tanggalKolomIndex.push({ tgl: tglNum, kolomIndex: colIndex });
            }
        }

        // Proses baris-baris karyawan
        for (let i = 3; i < data.length; i++) {
            const row = data[i];
            const id = row[1];
            const nama = row[2];
            const posisi = row[3];
            const department = 'Unknown';

            if (!id || !nama || nama === 'NAMA LENGKAP') continue;

            const jadwal = [];

            for (const { tgl, kolomIndex } of tanggalKolomIndex) {
                const shift = row[kolomIndex];
                const tanggalStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(tgl).padStart(2, '0')}`;
                if (shift !== undefined && String(shift).trim() !== '') {
                    jadwal.push({ date: tanggalStr, shift: String(shift) });
                }
            }

            // Jangan simpan jika tidak ada shift valid
            if (jadwal.length > 0) {
                hasil.push({
                    employee_id: String(id),
                    name: String(nama),
                    position: String(posisi),
                    department,
                    schedule: jadwal,
                });
            }
        }
    }

    return hasil;
}
