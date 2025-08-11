# Jadwal Backend API

Sistem backend untuk mengelola jadwal karyawan dan sinkronisasi data absensi yang terintegrasi dengan sistem attendance eksternal.

## 🚀 Gambaran Umum

Jadwal Backend adalah aplikasi Node.js yang menggunakan MongoDB sebagai database untuk mengelola:
- Import jadwal karyawan dari file Excel
- Sinkronisasi data absensi dari API attendance eksternal
- Autentikasi melalui proxy ke sistem attendance
- Penyediaan API untuk aplikasi mobile Android

## 🏗️ Arsitektur Sistem

### Flow Logic Sistem (High Level)

```
[Excel File] → [Backend: Upload Excel] → [MongoDB: Jadwal] → [App: Ambil Jadwal]
[User Login] → [Backend: Proxy Auth] → [Attendance API] → [Response ke App]
[UserID] → [Backend: Sync] → [Attendance API] → [MongoDB: Absensi] → [App: Tampil Data]
```

## 📋 Fitur Utama

### 1. **Import Jadwal dari Excel**
- Upload file Excel berisi jadwal karyawan
- Parse dan mapping data ke schema karyawan
- Penyimpanan ke MongoDB

### 2. **Sinkronisasi Data Absensi**
- Integrasi dengan API attendance eksternal
- Fetch data clockin, clockout, break, lokasi, dan foto
- Penyimpanan data absensi ke MongoDB

### 3. **Sistem Autentikasi**
- Proxy login ke API attendance eksternal
- Manajemen token sesi
- Validasi user credentials

### 4. **Image Migration System**
- Migrasi gambar absensi ke ImageKit
- Batch processing dengan pagination
- Progress tracking dan statistik migrasi
- Force update untuk retry failed migrations

## 🛠️ Teknologi yang Digunakan

- **Runtime**: Node.js
- **Database**: MongoDB
- **File Processing**: Excel parsing
- **HTTP Client**: Untuk integrasi API eksternal
- **Authentication**: Token-based authentication
- **Image Storage**: ImageKit (untuk migrasi dan storage gambar)

## 📡 API Endpoints

### Authentication

#### POST `/api/auth/login`
Login user melalui proxy ke API attendance.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "token": "session_token",
  "user_id": "2405047",
  "message": "Login successful"
}
```

### Schedule Management

#### POST `/api/schedule/upload-excel`
Upload dan import jadwal dari file Excel.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- File: Excel file (.xlsx, .xls)

**Response:**
```json
{
  "success": true,
  "message": "Jadwal berhasil diimport",
  "imported_count": 150
}
```

#### GET `/api/schedule/:userid`
Ambil jadwal karyawan berdasarkan user ID.

**Parameters:**
- `userid`: ID karyawan

**Response:**
```json
{
  "user_id": "2405047",
  "name": "Anggi Firmansyah",
  "schedule": [
    {
      "date": "2025-07-21",
      "shift": "Pagi"
    },
    {
      "date": "2025-07-22", 
      "shift": "Siang"
    }
  ]
}
```

### Attendance Management

#### POST `/api/attendance/sync`
Sinkronisasi data absensi dari API eksternal.

**Request Body:**
```json
{
  "user_id": "2405047"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data absensi berhasil disinkronisasi",
  "synced_records": 30
}
```

#### GET `/api/attendance/:userid`
Ambil data absensi karyawan.

**Response:**
```json
{
  "user_id": "2405047",
  "date": "2025-07-21",
  "clock_in": {
    "time": "11:59:20",
    "location": "MMX3+6MM...",
    "image": "http://attendance-api.shabuhachi.id/images/2405047_20250721115920.jpg"
  },
  "break_out": {
    "time": "12:30:15",
    "location": "MMX3+6MM...",
    "image": "http://attendance-api.shabuhachi.id/images/2405047_20250721123015.jpg"
  },
  "break_in": {
    "time": "13:30:10",
    "location": "MMX3+6MM...",
    "image": "http://attendance-api.shabuhachi.id/images/2405047_20250721133010.jpg"
  },
  "clock_out": {
    "time": "17:00:05",
    "location": "MMX3+6MM...",
    "image": "http://attendance-api.shabuhachi.id/images/2405047_20250721170005.jpg"
  }
}
```

### Image Migration

#### POST `/api/attendance/migrate-images`
Migrasi semua URL gambar yang ada di database ke ImageKit.

**Query Parameters:**
- `limit` (number, default: 50): Jumlah record yang akan diproses per request
- `skip` (number, default: 0): Jumlah record yang akan di-skip (untuk pagination)
- `forceUpdate` (boolean, default: false): Jika true, akan migrasi ulang gambar yang sudah ada di ImageKit

**Request Examples:**
```bash
# Migrasi 50 record pertama
POST /api/attendance/migrate-images

# Migrasi dengan pagination
POST /api/attendance/migrate-images?limit=20&skip=40

# Force update gambar yang sudah di ImageKit
POST /api/attendance/migrate-images?forceUpdate=true&limit=10
```

**Response:**
```json
{
  "message": "Image migration process completed.",
  "totalRecords": 1250,
  "processed": 50,
  "success": 48,
  "failed": 2,
  "hasMore": true,
  "nextSkip": 50,
  "results": [
    {
      "userid": "EMP001",
      "date": "2024-01-15",
      "images": {
        "start_image": {
          "original": "http://external-api.com/image1.jpg",
          "migrated": "https://ik.imagekit.io/yourkit/attendance/2024/01/EMP001_20240115_start_1705123456.jpg"
        },
        "break_out_image": {
          "original": "http://external-api.com/image2.jpg", 
          "migrated": "https://ik.imagekit.io/yourkit/attendance/2024/01/EMP001_20240115_break_out_1705123457.jpg"
        },
        "break_in_image": {
          "original": "http://external-api.com/image3.jpg",
          "error": "Failed to download image"
        },
        "end_image": {
          "original": "https://ik.imagekit.io/yourkit/existing.jpg",
          "migrated": "https://ik.imagekit.io/yourkit/existing.jpg",
          "error": "Already migrated (skipped)"
        }
      }
    }
  ]
}
```

#### GET `/api/attendance/migration-stats`
Mendapatkan statistik proses migrasi gambar.

**Response:**
```json
{
  "message": "Migration statistics retrieved successfully.",
  "stats": {
    "totalWithImages": 1250,
    "alreadyMigrated": 450,
    "needMigration": 800,
    "migrationProgress": "36.00%"
  },
  "sampleRecords": [
    {
      "userid": "EMP001",
      "date": "2024-01-15",
      "imageUrls": {
        "start_image": "http://external-api.com/image1.jpg",
        "break_out_image": "http://external-api.com/image2.jpg",
        "break_in_image": null,
        "end_image": "http://external-api.com/image4.jpg"
      }
    }
  ]
}
```

## 🗄️ Struktur Database MongoDB

### Collection: Schedules
```javascript
{
  "user_id": "2405047",
  "name": "Anggi Firmansyah", 
  "schedule": [
    {
      "date": "2025-07-21",
      "shift": "Pagi"
    }
  ],
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### Collection: Attendances
```javascript
{
  "user_id": "2405047",
  "date": "2025-07-21",
  "clock_in": {
    "time": "11:59:20",
    "location": "MMX3+6MM...",
    "image": "http://attendance-api.shabuhachi.id/images/2405047_20250721115920.jpg"
  },
  "break_out": {
    "time": "12:30:15",
    "location": "MMX3+6MM...", 
    "image": "http://attendance-api.shabuhachi.id/images/2405047_20250721123015.jpg"
  },
  "break_in": {
    "time": "13:30:10",
    "location": "MMX3+6MM...",
    "image": "http://attendance-api.shabuhachi.id/images/2405047_20250721133010.jpg"
  },
  "clock_out": {
    "time": "17:00:05",
    "location": "MMX3+6MM...",
    "image": "http://attendance-api.shabuhachi.id/images/2405047_20250721170005.jpg"
  },
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### Collection: Users (Optional)
```javascript
{
  "user_id": "2405047",
  "username": "anggi.firmansyah",
  "name": "Anggi Firmansyah",
  "email": "anggi@company.com",
  "department": "IT",
  "position": "Software Developer",
  "created_at": "2025-01-15T10:30:00Z",
  "last_login": "2025-01-15T10:30:00Z"
}
```

## 🔗 Integrasi API Eksternal

### Attendance API
**Base URL**: `http://attendance-api.shabuhachi.id`

#### Endpoints yang Digunakan:
1. **Login Check**: `/service/check_login1.php`
2. **Trip Report**: `/service/getTripReport1.php`

## 📱 Integrasi dengan Aplikasi Mobile

### Flow Aplikasi Android:

1. **Login**
   - Input username & password
   - Kirim ke `/api/auth/login`
   - Simpan token dan user_id

2. **Ambil Jadwal**
   - Request ke `/api/schedule/:userid`
   - Tampilkan di kalender mobile

3. **Sinkronisasi Absensi**
   - Request ke `/api/attendance/sync`
   - Tampilkan data absensi (clockin/out, lokasi, foto)

4. **Image Migration (Admin)**
   - Check migration stats: `/api/attendance/migration-stats`
   - Migrate images: `/api/attendance/migrate-images`
   - Monitor progress dan handle errors

## 🚀 Instalasi & Setup

### Prerequisites
- Node.js (v14 atau lebih baru)
- MongoDB (v4.4 atau lebih baru)
- NPM atau Yarn

### Langkah Instalasi

1. **Clone Repository**
   ```bash
   git clone https://github.com/butonG21/jadwal-backend.git
   cd jadwal-backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit file `.env`:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/jadwal_db
   ATTENDANCE_API_BASE_URL=http://attendance-api.shabuhachi.id
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   
   # ImageKit Configuration (for image migration)
   IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
   IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
   IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
   ```

4. **Jalankan Aplikasi**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🧪 Testing

### Manual Testing
Gunakan tools seperti Postman atau Insomnia untuk testing API endpoints.

### Collection Postman
Import collection Postman yang tersedia di folder `/docs/postman/` (jika ada).

## 📁 Struktur Project

```
jadwal-backend/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── scheduleController.js
│   │   └── attendanceController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Schedule.js
│   │   └── Attendance.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── schedule.js
│   │   └── attendance.js
│   ├── middleware/
│   │   ├── authentication.js
│   │   └── validation.js
│   ├── services/
│   │   ├── attendanceService.js
│   │   ├── excelParser.js
│   │   └── imageMigrationService.js
│   └── utils/
│       ├── database.js
│       └── helpers.js
├── uploads/
├── docs/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🖼️ Image Migration Workflow

### Migration Process Overview
Sistem ini menyediakan fitur untuk memigrasikan gambar absensi dari server eksternal ke ImageKit untuk performa dan reliability yang lebih baik.

### Step-by-Step Migration

#### 1. Check Migration Statistics
```bash
GET /api/attendance/migration-stats
```
Cek berapa total gambar yang perlu dimigrasi dan progress saat ini.

#### 2. Start Batch Migration
```bash
# Mulai dengan batch pertama (50 records)
POST /api/attendance/migrate-images?limit=50

# Lanjutkan dengan batch berikutnya
POST /api/attendance/migrate-images?limit=50&skip=50
```

#### 3. Monitor Progress
```bash
# Cek progress setelah beberapa batch
GET /api/attendance/migration-stats
```

#### 4. Handle Failed Images
```bash
# Retry failed migrations dengan force update
POST /api/attendance/migrate-images?forceUpdate=true&limit=10
```

### Migration Best Practices

#### Batch Processing
- Gunakan limit kecil (20-50) untuk menghindari timeout
- Tunggu selesai satu batch sebelum memulai batch berikutnya
- Monitor server resources selama proses migrasi

#### Error Recovery
- Jika ada batch yang gagal, ulangi dengan skip yang sama
- Gunakan `forceUpdate=true` untuk retry gambar yang gagal
- Check migration stats secara berkala

#### Production Considerations
- Jalankan migrasi saat traffic rendah
- Setup monitoring dan alerting
- Backup database sebelum migrasi besar-besaran
- Consider menggunakan queue system untuk proses yang sangat besar

### Monitoring Commands
```bash
# Cek total progress
curl "http://localhost:3000/api/attendance/migration-stats"

# Migrasi batch kecil untuk testing
curl -X POST "http://localhost:3000/api/attendance/migrate-images?limit=5"

# Force update untuk retry failed images
curl -X POST "http://localhost:3000/api/attendance/migrate-images?limit=10&forceUpdate=true"
```

- **Authentication**: Token-based authentication
- **Validation**: Input validation untuk semua endpoints
- **CORS**: Configured untuk aplikasi mobile
- **Rate Limiting**: Implementasi rate limiting untuk API
- **Error Handling**: Comprehensive error handling

## 📊 Monitoring & Logging

- **Logging**: Implementasi logging untuk tracking request/response
- **Error Tracking**: Error tracking untuk debugging
- **Performance**: Monitoring performance API

## 🤝 Kontribusi

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 Lisensi

Proyek ini menggunakan lisensi [MIT License](LICENSE).

## 📞 Kontak

- **Developer**: butonG21
- **GitHub**: [https://github.com/butonG21](https://github.com/butonG21)
- **Repository**: [https://github.com/butonG21/jadwal-backend](https://github.com/butonG21/jadwal-backend)

## 🔄 Changelog

### Version 1.0.0
- Initial release
- Basic CRUD operations untuk jadwal
- Integrasi dengan attendance API
- Authentication system
- Excel import functionality

### Version 1.1.0
- Image migration system ke ImageKit
- Batch processing untuk migrasi
- Migration statistics dan monitoring
- Error handling untuk failed migrations
- Force update functionality

---

*Dokumentasi ini akan terus diperbarui seiring dengan pengembangan fitur baru.*