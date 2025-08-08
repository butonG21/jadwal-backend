# Image Migration API Documentation

## 1. Migrate Existing Images

**POST** `/api/attendance/migrate-images`

Endpoint untuk melakukan migrasi semua URL gambar yang ada di database ke ImageKit.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Jumlah record yang akan diproses per request |
| `skip` | number | 0 | Jumlah record yang akan di-skip (untuk pagination) |
| `forceUpdate` | boolean | false | Jika true, akan migrasi ulang gambar yang sudah ada di ImageKit |

### Request Examples

```bash
# Migrasi 50 record pertama
POST /api/attendance/migrate-images

# Migrasi dengan pagination
POST /api/attendance/migrate-images?limit=20&skip=40

# Force update gambar yang sudah di ImageKit
POST /api/attendance/migrate-images?forceUpdate=true&limit=10
```

### Response Format

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

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `totalRecords` | number | Total record di database yang memiliki gambar |
| `processed` | number | Jumlah record yang diproses dalam request ini |
| `success` | number | Jumlah record yang berhasil dimigrasi |
| `failed` | number | Jumlah record yang gagal dimigrasi |
| `hasMore` | boolean | Apakah masih ada record yang belum diproses |
| `nextSkip` | number | Nilai skip untuk request selanjutnya |
| `results` | array | Detail hasil migrasi per record |

## 2. Get Migration Statistics

**GET** `/api/attendance/migration-stats`

Endpoint untuk mendapatkan statistik proses migrasi.

### Request Example

```bash
GET /api/attendance/migration-stats
```

### Response Format

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

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `stats.totalWithImages` | number | Total record yang memiliki gambar |
| `stats.alreadyMigrated` | number | Jumlah record yang sudah dimigrasi ke ImageKit |
| `stats.needMigration` | number | Jumlah record yang masih perlu dimigrasi |
| `stats.migrationProgress` | string | Persentase progress migrasi |
| `sampleRecords` | array | Sample 5 record yang belum dimigrasi |

## 3. Usage Workflow

### Step 1: Check Migration Stats
```bash
GET /api/attendance/migration-stats
```

### Step 2: Start Migration Process
```bash
# Mulai dengan batch pertama
POST /api/attendance/migrate-images?limit=50

# Lanjutkan dengan batch berikutnya
POST /api/attendance/migrate-images?limit=50&skip=50

# Dan seterusnya sampai hasMore = false
```

### Step 3: Monitor Progress
```bash
# Cek progress setelah beberapa batch
GET /api/attendance/migration-stats
```

## 4. Error Handling

### Common Error Responses

```json
{
  "error": "Internal server error occurred while migrating images."
}
```

### Image Processing Errors

Jika ada gambar yang gagal diproses, sistem akan:
1. Log error ke console
2. Keep original URL as fallback
3. Continue dengan gambar lainnya
4. Report error dalam response results

## 5. Best Practices

### Batch Processing
- Gunakan limit kecil (20-50) untuk menghindari timeout
- Tunggu selesai satu batch sebelum memulai batch berikutnya
- Monitor server resources selama proses migrasi

### Error Recovery
- Jika ada batch yang gagal, ulangi dengan skip yang sama
- Gunakan `forceUpdate=true` untuk retry gambar yang gagal
- Check migration stats secara berkala

### Production Considerations
- Jalankan migrasi saat traffic rendah
- Setup monitoring dan alerting
- Backup database sebelum migrasi besar-besaran
- Consider menggunakan queue system untuk proses yang sangat besar

## 6. Monitoring Commands

```bash
# Cek total progress
curl "http://localhost:3000/api/attendance/migration-stats"

# Migrasi batch kecil untuk testing
curl -X POST "http://localhost:3000/api/attendance/migrate-images?limit=5"

# Force update untuk retry failed images
curl -X POST "http://localhost:3000/api/attendance/migrate-images?limit=10&forceUpdate=true"
```