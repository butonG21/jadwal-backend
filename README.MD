⚙️ FLOW LOGIC SISTEM - HIGH LEVEL
1. Backend (Node.js + MongoDB)
A. Endpoint untuk Import Jadwal dari Excel
[POST] /api/schedule/upload-excel

Upload file Excel jadwal.

Parse file → mapping ke schema karyawan (nama, tanggal, shift).

Simpan ke MongoDB.

B. Endpoint untuk Sinkronisasi Data Absensi dari API Attendance
[POST] /api/attendance/sync

Input: userid dari user attendance.

Fetch data dari http://attendance-api.shabuhachi.id/service/getTripReport1.php.

Ambil data clockin, clockout, break, lokasi, foto.

Simpan sebagai dokumen absensi ke MongoDB.

C. Endpoint untuk Login (Proxy ke API Attendance)
[POST] /api/auth/login

Terima username, password.

Kirim ke API attendance eksternal /check_login1.php.

Jika berhasil, simpan user (opsional) ke MongoDB, dan return token sesi untuk aplikasi Anda.

📱 Flow Aplikasi Android
1. Login
Input username & password.

Kirim ke backend Anda (/api/auth/login).

Jika valid, simpan token dan userid.

2. Ambil Jadwal
Hit endpoint /api/schedule/:userid (GET).

Tampilkan di kalender.

3. Sinkronisasi Absensi
Setelah login, ambil absensi dari API eksternal via backend:

Kirim request ke /api/attendance/sync (POST dengan userid).

Backend ambil data report dan simpan ke MongoDB.

Aplikasi bisa menampilkan rekap clockin/out, lokasi, foto, dll.

🧩 Flow Diagram (Tekstual)
css
Copy
Edit
[Excel File] 
    ↓
[Backend: Upload Excel]
    ↓
[MongoDB: Simpan Jadwal]
    ↑
[Frontend: App ambil jadwal]

[User Login Form]
    ↓
[Backend: Proxy ke Attendance API]
    ↓
[Attendance API: /check_login1.php]
    ↓
[Login Response] ← [Backend Response]

[UserID] 
    ↓
[Backend: /attendance/sync]
    ↓
[Attendance API: /getTripReport1.php]
    ↓
[Absensi Data] → [Simpan ke MongoDB]
    ↑
[App: Ambil & Tampilkan Absensi]
🗃️ Struktur Data MongoDB (Contoh)
✅ Jadwal
json
Copy
Edit
{
  "user_id": "2405047",
  "name": "Anggi Firmansyah",
  "schedule": [
    {
      "date": "2025-07-21",
      "shift": "Pagi"
    },
    ...
  ]
}
✅ Absensi
json
Copy
Edit
{
  "user_id": "2405047",
  "date": "2025-07-21",
  "clock_in": {
    "time": "11:59:20",
    "location": "MMX3+6MM...",
    "image": "http://.../2405047_20250721115920.jpg"
  },
  "break_out": {...},
  "break_in": {...},
  "clock_out": {...}
}