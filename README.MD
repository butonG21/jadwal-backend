# Jadwal Backend API - Enhanced Version 2.0

A robust, scalable Node.js/Express backend API for employee scheduling and attendance management with comprehensive error handling, security features, and modern architecture patterns.

## 🚀 Key Improvements

### Architecture Enhancements
- **Class-based Controllers**: Better organization and maintainability
- **Service Layer Pattern**: Separation of business logic from controllers
- **Centralized Configuration**: Environment validation and configuration management
- **Enhanced Error Handling**: Comprehensive error types and handling middleware
- **Logging System**: Winston-based structured logging
- **Caching Layer**: Node-cache for improved performance
- **Input Validation**: Joi-based request validation

### Security Improvements
- **Enhanced JWT**: Proper token management with refresh capabilities
- **Rate Limiting**: Protection against brute force attacks
- **Helmet Security**: Comprehensive security headers
- **Input Sanitization**: Protection against injection attacks
- **CORS Configuration**: Proper cross-origin resource sharing setup

### Performance & Reliability
- **Connection Pooling**: Optimized MongoDB connections
- **Image Processing**: Batch processing with proper error handling
- **Graceful Shutdown**: Proper cleanup on application termination
- **Health Checks**: Comprehensive system monitoring endpoints
- **Request Tracing**: Request ID tracking for debugging
- **Automated Cron Jobs**: Scheduled attendance data fetching with authentication
- **Asynchronous Processing**: Background job processing to prevent HTTP timeouts
- **Job Queue System**: In-memory job tracking with real-time status monitoring
- **Progress Tracking**: Real-time progress updates for long-running operations

### Profile Image Management
- **ImageKit Integration**: Cloud-based image processing and CDN delivery
- **Multiple Image Variants**: Automatic generation of thumbnail, small, medium, and original sizes
- **Image Optimization**: Automatic format conversion and quality optimization
- **Secure Upload**: Rate-limited uploads with file type and size validation
- **Metadata Management**: Support for alt text and captions

### Lateness Calculation Features
- **Comprehensive Lateness Detection**: Calculates start lateness, break lateness, and total lateness minutes
- **Advanced Attendance Status Detection**: Supports multiple attendance statuses:
  - `on_time`: Employee arrived on time
  - `late`: Employee arrived 1-15 minutes late
  - `very_late`: Employee arrived more than 15 minutes late
  - `absent`: No attendance data or all times are 00:00:00
  - `off_day`: Scheduled day off (OFF/CT)
  - `early_departure`: Employee left before scheduled end time
  - `incomplete_attendance`: Partial attendance data (only check-in or check-out)
- **Intelligent Data Validation**: Automatically detects and handles:
  - Missing attendance data
  - Invalid time entries (00:00:00 treated as no data)
  - Incomplete check-in/check-out records
  - Schedule validation and holiday detection
- **Statistical Reporting**: Provides detailed statistics including:
  - Average start lateness (in readable format)
  - Total late minutes (in readable format)
  - Attendance rate and punctuality rate
  - Breakdown of on-time, late, very late, and absent days
- **Period-based Analysis**: Supports daily, weekly, and monthly statistics
- **Employee-specific Reporting**: Includes employee name and period in all reports
- **Accurate Working Minutes Calculation**: Calculates actual working minutes based on shift schedule
- **Break Time Analysis**: Tracks break lateness and calculates break duration
- **Robust Error Handling**: Comprehensive error handling for edge cases and data inconsistencies

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **MongoDB** (v5.0 or higher)
- **Redis** (v6.0 or higher) - for caching
- **Git** - for version control

## 🔍 System Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600.123,
  "environment": "development",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "name": "jadwal_db"
  },
  "memory": {
    "used": "45.2 MB",
    "total": "128 MB"
  }
}
```

### API Documentation
```http
GET /api-docs
```

**Response:** Returns Swagger/OpenAPI documentation interface

### API Documentation JSON
```http
GET /api-docs.json
```

**Response:** Returns OpenAPI specification in JSON format

### External Services

- **ImageKit Account** - for profile image processing and CDN delivery
  - Sign up at [ImageKit.io](https://imagekit.io)
  - Get your Public Key, Private Key, and URL Endpoint
  - Configure the environment variables accordingly

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
JWT_ISSUER=jadwal-api

# External APIs
ATTENDANCE_API_URL=http://attendance-api.shabuhachi.id/service

# ImageKit Configuration
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id

# Profile Image Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
UPLOAD_RATE_LIMIT_WINDOW=900000
UPLOAD_RATE_LIMIT_MAX=5

# CORS Configuration (production)
CORS_ORIGINS=https://yourapp.com,https://www.yourapp.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=info

# Timezone
TZ=Asia/Jakarta

# Cron Job Configuration
ATTENDANCE_CRON_ENABLED=true
ATTENDANCE_CRON_SCHEDULE=0 7,8,13,18 * * *
ATTENDANCE_CRON_SCHEDULE_NIGHT=50 23 * * *
ATTENDANCE_CRON_TIMEZONE=Asia/Jakarta

# Cron Authentication (required for API access)
CRON_USERNAME=your-cron-username
CRON_PASSWORD=your-cron-password
```

## 🚀 Installation & Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd jadwal-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start the application**

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## 📚 API Documentation

### Base URLs
- **Development**: `http://localhost:5000`
- **Production**: `https://your-api-domain.com`

### API Versioning
- **Current**: `/api/v1/`
- **Backward Compatible**: `/api/` (redirects to v1)

## 🔐 Authentication

All protected endpoints require a Bearer token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

## ⏰ Lateness Calculation Endpoints

### Calculate Lateness for a Specific Date
```http
POST /api/lateness/calculate/date/:employeeId
Authorization: Bearer <token>
```

**Description**: Menghitung keterlambatan untuk satu karyawan pada tanggal tertentu. Endpoint ini akan memproses data kehadiran karyawan untuk tanggal yang diberikan dan menentukan apakah ada keterlambatan masuk kerja atau keterlambatan setelah istirahat.

**Parameters**:
- `employeeId` (path): ID unik karyawan yang akan dihitung keterlambatannya
- `date` (query, optional): Tanggal dalam format YYYY-MM-DD. Jika tidak disediakan, akan menggunakan tanggal hari ini

**Example Request**:
```http
POST /api/lateness/calculate/date/EMP001?date=2024-01-15
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response**:
```json
{
  "success": true,
  "message": "Lateness calculated successfully",
  "data": {
    "employee_id": "EMP001",
    "employee_name": "John Doe",
    "date": "2024-01-15",
    "shift_start": "08:00:00",
    "shift_end": "17:00:00",
    "break_start": "12:00:00",
    "break_end": "13:00:00",
    "actual_start_time": "08:15:00",
    "actual_end_time": "17:05:00",
    "actual_break_out": "12:05:00",
    "actual_break_in": "13:10:00",
    "start_lateness_minutes": 15,
    "end_lateness_minutes": 0,
    "break_lateness_minutes": 10,
    "total_working_minutes": 475,
    "scheduled_working_minutes": 480,
    "attendance_status": "late",
    "break_status": "late",
    "is_complete_attendance": true,
    "notes": "Employee arrived 15 minutes late"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Employee not found or no schedule available",
  "error": {
    "code": "EMPLOYEE_NOT_FOUND",
    "details": "No employee found with ID: EMP001"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Calculate Lateness for a Date Range
```http
POST /api/lateness/calculate/range/:employeeId
Authorization: Bearer <token>
```

**Description**: Menghitung keterlambatan untuk satu karyawan dalam rentang tanggal yang ditentukan. Endpoint ini akan mengulang perhitungan keterlambatan harian untuk setiap tanggal dalam rentang yang diberikan.

**Parameters**:
- `employeeId` (path): ID unik karyawan
- `startDate` (query): Tanggal mulai rentang dalam format YYYY-MM-DD
- `endDate` (query): Tanggal akhir rentang dalam format YYYY-MM-DD
- `saveToDb` (query, optional): Nilai boolean (`true`/`false`) untuk menyimpan hasil perhitungan ke database. Default: `false`

**Example Request**:
```http
POST /api/lateness/calculate/range/EMP001?startDate=2024-01-01&endDate=2024-01-31&saveToDb=true
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response**:
```json
{
  "success": true,
  "message": "Lateness calculated for date range successfully",
  "data": {
    "employee_id": "EMP001",
    "employee_name": "John Doe",
    "period": {
      "start_date": "2024-01-01",
      "end_date": "2024-01-31",
      "total_days": 31,
      "working_days": 22,
      "off_days": 9
    },
    "summary": {
      "total_late_minutes": 180,
      "average_start_lateness": "8 minutes 10 seconds",
      "attendance_rate": 95.45,
      "punctuality_rate": 72.73,
      "status_breakdown": {
        "on_time": 16,
        "late": 4,
        "very_late": 1,
        "absent": 1,
        "incomplete_attendance": 0,
        "off_day": 9
      }
    },
    "daily_records": [
      {
        "date": "2024-01-01",
        "attendance_status": "off_day",
        "shift_type": "OFF"
      },
      {
        "date": "2024-01-02",
        "attendance_status": "on_time",
        "start_lateness_minutes": 0,
        "break_lateness_minutes": 0,
        "total_working_minutes": 480,
        "is_complete_attendance": true
      },
      {
        "date": "2024-01-03",
        "attendance_status": "late",
        "start_lateness_minutes": 12,
        "break_lateness_minutes": 5,
        "total_working_minutes": 468,
        "is_complete_attendance": true
      }
    ],
    "saved_to_database": true
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Calculate Lateness for a Month
```http
POST /api/lateness/calculate/month/:employeeId
Authorization: Bearer <token>
```

**Description**: Menghitung keterlambatan untuk satu karyawan selama satu bulan penuh. Endpoint ini akan mengagregasi data keterlambatan harian untuk menghasilkan statistik bulanan.

**Parameters**:
- `employeeId` (path): ID unik karyawan
- `month` (query): Bulan (angka 1-12)
- `year` (query): Tahun (misalnya, 2024)
- `saveToDb` (query, optional): Nilai boolean (`true`/`false`) untuk menyimpan hasil perhitungan ke database. Default: `false`

**Example Request**:
```http
POST /api/lateness/calculate/month/EMP001?month=1&year=2024&saveToDb=true
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response**:
```json
{
  "success": true,
  "message": "Monthly lateness calculated successfully",
  "data": {
    "employee_id": "EMP001",
    "employee_name": "John Doe",
    "period": {
      "month": 1,
      "year": 2024,
      "month_name": "January",
      "total_days": 31,
      "working_days": 22,
      "off_days": 9
    },
    "monthly_summary": {
      "total_late_minutes": "3 hours 15 minutes",
      "average_start_lateness": "8 minutes 52 seconds",
      "average_working_hours": "7 hours 58 minutes",
      "attendance_rate": 95.45,
      "punctuality_rate": 68.18,
      "complete_attendance_rate": 100.0
    },
    "detailed_breakdown": {
      "status_counts": {
        "on_time": 15,
        "late": 5,
        "very_late": 1,
        "absent": 1,
        "incomplete_attendance": 0,
        "off_day": 9,
        "early_departure": 0
      },
      "lateness_distribution": {
        "0_minutes": 15,
        "1_to_5_minutes": 2,
        "6_to_15_minutes": 3,
        "16_to_30_minutes": 1,
        "over_30_minutes": 0
      },
      "break_analysis": {
        "total_break_lateness_minutes": 45,
        "average_break_lateness": "2 minutes 3 seconds",
        "days_with_break_lateness": 8
      }
    },
    "weekly_trends": [
      {
        "week": 1,
        "dates": "2024-01-01 to 2024-01-07",
        "punctuality_rate": 80.0,
        "average_lateness": "5 minutes"
      },
      {
        "week": 2,
        "dates": "2024-01-08 to 2024-01-14",
        "punctuality_rate": 60.0,
        "average_lateness": "12 minutes"
      }
    ],
    "saved_to_database": true
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Get Lateness Data
```http
GET /api/lateness/data/:employeeId
Authorization: Bearer <token>
```

**Description**: Mengambil data keterlambatan yang sudah tersimpan di database untuk karyawan tertentu. Data dapat difilter berdasarkan tanggal spesifik atau rentang tanggal.

**Parameters**:
- `employeeId` (path): ID unik karyawan
- `date` (query, optional): Tanggal spesifik dalam format YYYY-MM-DD untuk mengambil data satu hari
- `startDate` (query, optional): Tanggal mulai rentang dalam format YYYY-MM-DD
- `endDate` (query, optional): Tanggal akhir rentang dalam format YYYY-MM-DD
- `limit` (query, optional): Jumlah maksimal record yang dikembalikan (default: 100)
- `page` (query, optional): Halaman untuk pagination (default: 1)

**Example Request**:
```http
GET /api/lateness/data/EMP001?startDate=2024-01-01&endDate=2024-01-31&limit=50&page=1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response**:
```json
{
  "success": true,
  "message": "Lateness data retrieved successfully",
  "data": {
    "employee_id": "EMP001",
    "employee_name": "John Doe",
    "total_records": 22,
    "current_page": 1,
    "total_pages": 1,
    "records": [
      {
        "_id": "65a1b2c3d4e5f6789012345",
        "employee_id": "EMP001",
        "date": "2024-01-15",
        "shift_start": "08:00:00",
        "shift_end": "17:00:00",
        "break_start": "12:00:00",
        "break_end": "13:00:00",
        "actual_start_time": "08:15:00",
        "actual_end_time": "17:05:00",
        "actual_break_out": "12:05:00",
        "actual_break_in": "13:10:00",
        "start_lateness_minutes": 15,
        "end_lateness_minutes": 0,
        "break_lateness_minutes": 10,
        "total_working_minutes": 475,
        "scheduled_working_minutes": 480,
        "attendance_status": "late",
        "break_status": "late",
        "is_complete_attendance": true,
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z"
      },
      {
        "_id": "65a1b2c3d4e5f6789012346",
        "employee_id": "EMP001",
        "date": "2024-01-16",
        "attendance_status": "on_time",
        "start_lateness_minutes": 0,
        "break_lateness_minutes": 0,
        "total_working_minutes": 480,
        "is_complete_attendance": true
      }
    ]
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Get Lateness Statistics
```http
GET /api/lateness/stats/:employeeId?
Authorization: Bearer <token>
```

**Description**: Mengambil statistik keterlambatan untuk karyawan tertentu atau untuk semua karyawan dalam rentang tanggal yang diberikan. Statistik mencakup rata-rata keterlambatan, total menit keterlambatan, tingkat kehadiran, dan rincian status kehadiran.

**Parameters**:
- `employeeId` (path, optional): ID unik karyawan. Jika tidak disediakan, akan mengembalikan statistik untuk semua karyawan
- `startDate` (query, optional): Tanggal mulai rentang dalam format YYYY-MM-DD
- `endDate` (query, optional): Tanggal akhir rentang dalam format YYYY-MM-DD
- `groupBy` (query, optional): Pengelompokan statistik (`daily`, `weekly`, `monthly`). Default: `overall`

**Example Request (Single Employee)**:
```http
GET /api/lateness/stats/EMP001?startDate=2024-01-01&endDate=2024-01-31&groupBy=weekly
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (Single Employee)**:
```json
{
  "success": true,
  "message": "Lateness statistics retrieved successfully",
  "data": {
    "employee_id": "EMP001",
    "employee_name": "John Doe",
    "period": {
      "start_date": "2024-01-01",
      "end_date": "2024-01-31",
      "total_days": 31,
      "working_days": 22
    },
    "overall_statistics": {
      "total_late_minutes": 195,
      "total_late_minutes_formatted": "3 hours 15 minutes",
      "average_start_lateness": "8 minutes 52 seconds",
      "average_working_hours": "7 hours 58 minutes",
      "attendance_rate": 95.45,
      "punctuality_rate": 68.18,
      "complete_attendance_rate": 100.0
    },
    "status_breakdown": {
      "on_time": { "count": 15, "percentage": 68.18 },
      "late": { "count": 5, "percentage": 22.73 },
      "very_late": { "count": 1, "percentage": 4.55 },
      "absent": { "count": 1, "percentage": 4.55 },
      "incomplete_attendance": { "count": 0, "percentage": 0 },
      "off_day": { "count": 9, "percentage": 29.03 }
    },
    "weekly_trends": [
      {
        "week": 1,
        "period": "2024-01-01 to 2024-01-07",
        "working_days": 5,
        "punctuality_rate": 80.0,
        "average_lateness": "5 minutes",
        "total_late_minutes": 25
      },
      {
        "week": 2,
        "period": "2024-01-08 to 2024-01-14",
        "working_days": 6,
        "punctuality_rate": 66.67,
        "average_lateness": "8 minutes",
        "total_late_minutes": 48
      }
    ]
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Example Request (All Employees)**:
```http
GET /api/lateness/stats?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (All Employees)**:
```json
{
  "success": true,
  "message": "Company-wide lateness statistics retrieved successfully",
  "data": {
    "period": {
      "start_date": "2024-01-01",
      "end_date": "2024-01-31",
      "total_employees": 25
    },
    "company_overview": {
      "overall_punctuality_rate": 78.5,
      "overall_attendance_rate": 92.3,
      "total_late_incidents": 156,
      "average_company_lateness": "6 minutes 30 seconds"
    },
    "employee_rankings": {
      "most_punctual": [
        { "employee_id": "EMP005", "name": "Alice Johnson", "punctuality_rate": 100.0 },
        { "employee_id": "EMP012", "name": "Bob Smith", "punctuality_rate": 95.5 }
      ],
      "needs_improvement": [
        { "employee_id": "EMP018", "name": "Charlie Brown", "punctuality_rate": 45.5 },
        { "employee_id": "EMP003", "name": "David Wilson", "punctuality_rate": 52.3 }
      ]
    },
    "department_breakdown": [
      {
        "department": "IT",
        "punctuality_rate": 85.2,
        "employee_count": 8
      },
      {
        "department": "HR",
        "punctuality_rate": 72.1,
        "employee_count": 5
      }
    ]
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Get Late Employees
```http
GET /api/lateness/late-employees
Authorization: Bearer <token>
```

**Description**: Mengambil daftar karyawan yang terdeteksi terlambat pada tanggal tertentu. Endpoint ini berguna untuk melihat ringkasan cepat siapa saja yang terlambat pada hari itu.

**Parameters**:
- `date` (query, optional): Tanggal dalam format YYYY-MM-DD. Jika tidak disediakan, akan menggunakan tanggal hari ini
- `severity` (query, optional): Filter berdasarkan tingkat keterlambatan (`late`, `very_late`, `all`). Default: `all`
- `department` (query, optional): Filter berdasarkan departemen
- `limit` (query, optional): Jumlah maksimal record yang dikembalikan (default: 50)

**Example Request**:
```http
GET /api/lateness/late-employees?date=2024-01-15&severity=very_late&department=IT
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response**:
```json
{
  "success": true,
  "message": "Late employees retrieved successfully",
  "data": {
    "date": "2024-01-15",
    "total_late_employees": 8,
    "summary": {
      "late_count": 5,
      "very_late_count": 3,
      "total_late_minutes": 145,
      "average_lateness": "18 minutes 7 seconds"
    },
    "employees": [
      {
        "employee_id": "EMP001",
        "employee_name": "John Doe",
        "department": "IT",
        "position": "Software Developer",
        "scheduled_start": "08:00:00",
        "actual_start": "08:25:00",
        "lateness_minutes": 25,
        "lateness_formatted": "25 minutes",
        "attendance_status": "very_late",
        "break_lateness_minutes": 5,
        "is_repeat_offender": false,
        "late_days_this_month": 3
      },
      {
        "employee_id": "EMP007",
        "employee_name": "Sarah Wilson",
        "department": "HR",
        "position": "HR Specialist",
        "scheduled_start": "09:00:00",
        "actual_start": "09:12:00",
        "lateness_minutes": 12,
        "lateness_formatted": "12 minutes",
        "attendance_status": "late",
        "break_lateness_minutes": 0,
        "is_repeat_offender": true,
        "late_days_this_month": 8
      }
    ],
    "department_breakdown": [
      {
        "department": "IT",
        "late_count": 3,
        "total_employees": 8,
        "late_percentage": 37.5
      },
      {
        "department": "HR",
        "late_count": 2,
        "total_employees": 5,
        "late_percentage": 40.0
      }
    ]
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Bulk Lateness Calculation (Admin Only)
```http
POST /api/lateness/calculate/bulk
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Description**: Menghitung keterlambatan untuk beberapa karyawan sekaligus. Endpoint ini dirancang untuk penggunaan administratif dan membutuhkan peran `admin`.

**Request Body**:
```json
{
  "employeeIds": ["string"],  // Array ID karyawan yang akan diproses
  "date"?: "string",         // Tanggal spesifik (YYYY-MM-DD) jika perhitungan harian
  "startDate"?: "string",    // Tanggal mulai (YYYY-MM-DD) jika perhitungan rentang
  "endDate"?: "string",      // Tanggal akhir (YYYY-MM-DD) jika perhitungan rentang
  "saveToDb"?: "boolean",    // Menyimpan hasil ke database (default: false)
  "priority"?: "string"      // Prioritas job ("high", "normal", "low"). Default: "normal"
}
```

**Example Request**:
```http
POST /api/lateness/calculate/bulk
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "employeeIds": ["EMP001", "EMP002", "EMP003"],
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "saveToDb": true,
  "priority": "high"
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Bulk lateness calculation initiated successfully",
  "data": {
    "job_id": "bulk_calc_20240115_103000_abc123",
    "total_employees": 3,
    "estimated_duration": "5-10 minutes",
    "status": "processing",
    "progress": {
      "completed": 0,
      "total": 3,
      "percentage": 0
    },
    "results": {
      "successful": [],
      "failed": [],
      "processing": ["EMP001", "EMP002", "EMP003"]
    },
    "settings": {
      "period": {
        "start_date": "2024-01-01",
        "end_date": "2024-01-31"
      },
      "save_to_database": true,
      "priority": "high"
    },
    "started_at": "2025-01-15T10:30:00.000Z"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Job Completion Response** (when checking job status):
```json
{
  "success": true,
  "message": "Bulk calculation completed",
  "data": {
    "job_id": "bulk_calc_20240115_103000_abc123",
    "status": "completed",
    "progress": {
      "completed": 3,
      "total": 3,
      "percentage": 100
    },
    "results": {
      "successful": [
        {
          "employee_id": "EMP001",
          "records_processed": 22,
          "total_late_minutes": 180,
          "processing_time": "2.3 seconds"
        },
        {
          "employee_id": "EMP002",
          "records_processed": 20,
          "total_late_minutes": 95,
          "processing_time": "1.8 seconds"
        }
      ],
      "failed": [
        {
          "employee_id": "EMP003",
          "error": "No schedule found for employee",
          "error_code": "SCHEDULE_NOT_FOUND"
        }
      ]
    },
    "summary": {
      "total_records_processed": 42,
      "total_late_minutes": 275,
      "success_rate": 66.67,
      "total_processing_time": "4.1 seconds"
    },
    "completed_at": "2025-01-15T10:35:00.000Z"
  }
}
```

### Lateness Service Health Check
```http
GET /api/lateness/health
Authorization: Bearer <token>
```

**Description**: Melakukan pemeriksaan kesehatan pada layanan perhitungan keterlambatan untuk memastikan semua komponen (misalnya, koneksi database) berfungsi dengan baik.

**Example Request**:
```http
GET /api/lateness/health
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response**:
```json
{
  "success": true,
  "message": "Lateness service is healthy",
  "data": {
    "service_status": "operational",
    "database_connection": "connected",
    "last_calculation": "2025-01-15T09:45:00.000Z",
    "total_records_processed_today": 156,
    "average_processing_time": "1.2 seconds",
    "cache_status": "active",
    "memory_usage": {
      "used": "45.2 MB",
      "available": "82.8 MB"
    },
    "performance_metrics": {
      "calculations_per_minute": 25,
      "error_rate": 0.02,
      "uptime": "99.98%"
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Lateness service health check failed",
  "error": {
    "code": "DATABASE_CONNECTION_FAILED",
    "details": "Unable to connect to MongoDB",
    "affected_services": ["calculation", "statistics"]
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## 🧮 Lateness Calculation Logic

### Algoritma Perhitungan Keterlambatan

Sistem lateness calculation menggunakan algoritma yang komprehensif untuk menentukan status kehadiran dan menghitung keterlambatan dengan akurat:

#### 1. **Data Validation & Preprocessing**
```typescript
// Fungsi untuk mendeteksi waktu yang tidak valid
function isZeroTime(timeString: string): boolean {
  return timeString === '00:00:00' || !timeString;
}

// Validasi data kehadiran
const hasValidStartTime = attendance.start_time && !isZeroTime(attendance.start_time);
const hasValidEndTime = attendance.end_time && !isZeroTime(attendance.end_time);
```

#### 2. **Status Kehadiran Logic**

| Kondisi | Status | Deskripsi |
|---------|--------|-----------|
| `!hasValidStartTime && !hasValidEndTime` | `absent` | Tidak ada data kehadiran valid |
| `hasValidStartTime && !hasValidEndTime` | `incomplete_attendance` | Hanya check-in |
| `!hasValidStartTime && hasValidEndTime` | `incomplete_attendance` | Hanya check-out |
| `hasValidStartTime && hasValidEndTime` | Dihitung berdasarkan keterlambatan | Data lengkap |

#### 3. **Perhitungan Keterlambatan**

**Start Lateness:**
```typescript
if (hasValidStartTime) {
  const timeDiff = calculateTimeDifference(schedule.shift_start, attendance.start_time);
  start_lateness_minutes = timeDiff > 0 ? timeDiff : 0;
}
```

**Break Lateness:**
```typescript
if (attendance.break_out_time && !isZeroTime(attendance.break_out_time)) {
  const breakLateness = calculateTimeDifference(schedule.break_start, attendance.break_out_time);
  break_lateness_minutes = breakLateness > 0 ? breakLateness : 0;
}
```

**End Lateness (Early Departure):**
```typescript
if (hasValidEndTime) {
  const endDiff = calculateTimeDifference(attendance.end_time, schedule.shift_end);
  end_lateness_minutes = endDiff > 0 ? endDiff : 0;
}
```

#### 4. **Working Minutes Calculation**
```typescript
if (hasValidStartTime && hasValidEndTime) {
  let workingMinutes = calculateTimeDifference(attendance.start_time, attendance.end_time);
  
  // Kurangi durasi istirahat jika ada
  if (attendance.break_out_time && !isZeroTime(attendance.break_out_time) &&
      attendance.break_in_time && !isZeroTime(attendance.break_in_time)) {
    const breakDuration = calculateTimeDifference(attendance.break_out_time, attendance.break_in_time);
    workingMinutes -= breakDuration;
  }
  
  total_working_minutes = workingMinutes;
}
```

#### 5. **Attendance Status Classification**

```typescript
if (hasValidStartTime && hasValidEndTime) {
  if (start_lateness_minutes === 0) {
    attendance_status = 'on_time';
  } else if (start_lateness_minutes <= 15) {
    attendance_status = 'late';
  } else {
    attendance_status = 'very_late';
  }
  
  // Check for early departure
  if (end_lateness_minutes > 0) {
    attendance_status = 'early_departure';
  }
} else if (hasValidStartTime || hasValidEndTime) {
  attendance_status = 'incomplete_attendance';
} else {
  attendance_status = 'absent';
}
```

#### 6. **Break Status Classification**

```typescript
if (hasValidStartTime && hasValidEndTime) {
  if (attendance.break_out_time && !isZeroTime(attendance.break_out_time) &&
      attendance.break_in_time && !isZeroTime(attendance.break_in_time)) {
    break_status = break_lateness_minutes > 0 ? 'late' : 'on_time';
  } else {
    break_status = 'no_break';
  }
} else {
  break_status = 'no_data';
}
```

### Edge Cases Handling

1. **Shift Malam (Night Shift)**: Sistem menangani shift yang melewati tengah malam
2. **Hari Libur**: Otomatis terdeteksi sebagai `off_day` berdasarkan jadwal
3. **Data Tidak Lengkap**: Sistem tetap dapat menghitung statistik parsial
4. **Zona Waktu**: Semua perhitungan menggunakan zona waktu Asia/Jakarta
5. **Toleransi Waktu**: Sistem dapat dikonfigurasi untuk memberikan toleransi keterlambatan

### Performance Optimizations

- **Caching**: Hasil perhitungan di-cache untuk menghindari perhitungan ulang
- **Batch Processing**: Perhitungan bulk menggunakan queue system
- **Database Indexing**: Index pada field `employee_id`, `date`, dan `attendance_status`
- **Lazy Loading**: Data statistik dihitung on-demand

## 📊 Data Models & Schema

### Lateness Data Model

```typescript
interface LatenessData {
  _id?: string;
  employee_id: string;
  date: string; // Format: YYYY-MM-DD
  attendance_status: 'on_time' | 'late' | 'very_late' | 'absent' | 'off_day' | 'early_departure' | 'incomplete_attendance';
  start_lateness_minutes: number;
  break_lateness_minutes: number;
  end_lateness_minutes: number;
  total_working_minutes: number;
  break_status: 'on_time' | 'late' | 'no_break' | 'no_data';
  schedule_shift_start: string;
  schedule_shift_end: string;
  schedule_break_start?: string;
  schedule_break_end?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  actual_break_out_time?: string;
  actual_break_in_time?: string;
  created_at: Date;
  updated_at: Date;
}
```

### MongoDB Schema (Mongoose)

```typescript
const latenessSchema = new Schema({
  employee_id: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true,
    index: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  attendance_status: {
    type: String,
    required: true,
    enum: ['on_time', 'late', 'very_late', 'absent', 'off_day', 'early_departure', 'incomplete_attendance'],
    index: true
  },
  start_lateness_minutes: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  break_lateness_minutes: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  end_lateness_minutes: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  total_working_minutes: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  break_status: {
    type: String,
    required: true,
    enum: ['on_time', 'late', 'no_break', 'no_data'],
    default: 'no_data'
  },
  // Schedule data (for reference)
  schedule_shift_start: String,
  schedule_shift_end: String,
  schedule_break_start: String,
  schedule_break_end: String,
  // Actual attendance data (for reference)
  actual_start_time: String,
  actual_end_time: String,
  actual_break_out_time: String,
  actual_break_in_time: String
}, {
  timestamps: true,
  collection: 'lateness'
});

// Compound indexes for better query performance
latenessSchema.index({ employee_id: 1, date: 1 }, { unique: true });
latenessSchema.index({ date: 1, attendance_status: 1 });
latenessSchema.index({ employee_id: 1, attendance_status: 1 });
latenessSchema.index({ created_at: 1 });
```

### Statistics Response Model

```typescript
interface LatenessStatistics {
  employee_id?: string;
  period: {
    start_date: string;
    end_date: string;
    total_days: number;
  };
  attendance_summary: {
    total_working_days: number;
    on_time_days: number;
    late_days: number;
    very_late_days: number;
    absent_days: number;
    early_departure_days: number;
    incomplete_attendance_days: number;
    off_days: number;
  };
  lateness_metrics: {
    total_start_lateness_minutes: number;
    total_break_lateness_minutes: number;
    total_end_lateness_minutes: number;
    average_start_lateness_minutes: number;
    average_break_lateness_minutes: number;
    average_end_lateness_minutes: number;
    max_start_lateness_minutes: number;
    max_break_lateness_minutes: number;
    max_end_lateness_minutes: number;
  };
  working_time_metrics: {
    total_working_minutes: number;
    average_working_minutes: number;
    expected_working_minutes: number;
    working_time_deficit_minutes: number;
  };
  break_metrics: {
    total_break_days: number;
    on_time_break_days: number;
    late_break_days: number;
    no_break_days: number;
  };
  performance_indicators: {
    punctuality_rate: number; // Percentage of on-time days
    attendance_rate: number; // Percentage of non-absent days
    completion_rate: number; // Percentage of complete attendance records
    discipline_score: number; // Overall discipline score (0-100)
  };
  trends?: {
    weekly_average_lateness: number[];
    monthly_punctuality_trend: number[];
    improvement_rate: number;
  };
}
```

### Input Validation Rules

```typescript
// Date validation
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const isValidDate = (dateString: string): boolean => {
  if (!dateRegex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

// Employee ID validation
const employeeIdRegex = /^[a-zA-Z0-9_-]+$/;
const isValidEmployeeId = (employeeId: string): boolean => {
  return employeeId && employeeId.length >= 3 && employeeId.length <= 50 && employeeIdRegex.test(employeeId);
};

// Time format validation
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
const isValidTimeFormat = (timeString: string): boolean => {
  return timeRegex.test(timeString);
};

// Query parameter validation
const validationRules = {
  limit: { min: 1, max: 1000, default: 50 },
  page: { min: 1, default: 1 },
  groupBy: ['day', 'week', 'month', 'year'],
  severity: ['late', 'very_late', 'all'],
  priority: ['high', 'medium', 'low']
};
```

## 🚨 Error Handling & Troubleshooting

### Common Error Codes

| Error Code | HTTP Status | Description | Solution |
|------------|-------------|-------------|----------|
| `EMPLOYEE_NOT_FOUND` | 404 | Employee ID tidak ditemukan | Verifikasi employee_id yang valid |
| `INVALID_DATE_FORMAT` | 400 | Format tanggal tidak valid | Gunakan format YYYY-MM-DD |
| `INVALID_DATE_RANGE` | 400 | Rentang tanggal tidak valid | Pastikan start_date <= end_date |
| `ATTENDANCE_DATA_NOT_FOUND` | 404 | Data kehadiran tidak ditemukan | Periksa ketersediaan data attendance |
| `SCHEDULE_DATA_NOT_FOUND` | 404 | Data jadwal tidak ditemukan | Pastikan employee memiliki schedule |
| `DATABASE_CONNECTION_ERROR` | 500 | Koneksi database gagal | Periksa koneksi MongoDB |
| `CALCULATION_TIMEOUT` | 408 | Perhitungan timeout | Kurangi rentang data atau coba lagi |
| `INVALID_ENUM_VALUE` | 400 | Nilai enum tidak valid | Periksa nilai yang diizinkan |
| `RATE_LIMIT_EXCEEDED` | 429 | Batas rate limit terlampaui | Tunggu sebelum request berikutnya |
| `UNAUTHORIZED_ACCESS` | 401 | Token tidak valid atau expired | Login ulang atau refresh token |

### Error Response Format

```json
{
  "success": false,
  "message": "Human readable error message",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information",
    "field": "field_name", // Optional: untuk validation errors
    "value": "invalid_value", // Optional: nilai yang menyebabkan error
    "suggestions": [ // Optional: saran perbaikan
      "Use format YYYY-MM-DD for dates",
      "Check employee_id exists in database"
    ]
  },
  "timestamp": "2025-01-15T10:30:00.000Z",
  "request_id": "req_123456789" // Optional: untuk tracking
}
```

### Debugging Tips

#### 1. **Data Validation Issues**
```bash
# Check if employee exists
GET /api/employees/:employeeId

# Verify date format
echo "2025-01-15" | grep -E "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"

# Test with minimal date range
GET /api/lateness/calculate/range/EMP001?start_date=2025-01-15&end_date=2025-01-15
```

#### 2. **Performance Issues**
```bash
# Check service health
GET /api/lateness/health

# Use smaller date ranges
GET /api/lateness/calculate/range/EMP001?start_date=2025-01-01&end_date=2025-01-07

# Enable pagination
GET /api/lateness/data/EMP001?limit=10&page=1
```

#### 3. **Database Connection Issues**
```bash
# Check MongoDB connection
mongosh "mongodb+srv://your-connection-string"

# Verify collections exist
db.attendances.countDocuments()
db.schedules.countDocuments()
db.lateness.countDocuments()
```

### Monitoring & Logging

#### Log Levels
- **ERROR**: Critical errors yang memerlukan perhatian segera
- **WARN**: Potensi masalah atau kondisi tidak normal
- **INFO**: Informasi operasional normal
- **DEBUG**: Detail untuk troubleshooting

#### Key Metrics to Monitor
```typescript
interface LatenessServiceMetrics {
  calculations_per_minute: number;
  average_response_time: number;
  error_rate: number;
  database_connection_status: 'connected' | 'disconnected';
  cache_hit_rate: number;
  memory_usage: {
    used: string;
    available: string;
    percentage: number;
  };
  active_requests: number;
  queue_size: number;
}
```

#### Health Check Endpoints
```bash
# Service health
GET /api/lateness/health

# Database connectivity
GET /api/health/database

# System metrics
GET /api/health/metrics
```

### Performance Optimization Guidelines

#### 1. **Query Optimization**
- Gunakan pagination untuk dataset besar
- Batasi rentang tanggal maksimal 1 tahun
- Manfaatkan index database yang tersedia
- Cache hasil perhitungan yang sering diakses

#### 2. **Memory Management**
- Proses data dalam batch untuk dataset besar
- Implementasi streaming untuk export data
- Monitor memory usage secara berkala
- Cleanup cache secara otomatis

#### 3. **Database Optimization**
```javascript
// Recommended indexes
db.lateness.createIndex({ "employee_id": 1, "date": 1 }, { unique: true })
db.lateness.createIndex({ "date": 1, "attendance_status": 1 })
db.lateness.createIndex({ "employee_id": 1, "attendance_status": 1 })
db.lateness.createIndex({ "created_at": 1 })

// Query optimization
db.lateness.find({ 
  "employee_id": "EMP001", 
  "date": { $gte: "2025-01-01", $lte: "2025-01-31" } 
}).hint({ "employee_id": 1, "date": 1 })
```

### Backup & Recovery

#### Data Backup Strategy
```bash
# Daily backup of lateness collection
mongodump --collection=lateness --db=your_database --out=/backup/$(date +%Y%m%d)

# Restore from backup
mongorestore --collection=lateness --db=your_database /backup/20250115/your_database/lateness.bson
```

#### Recovery Procedures
1. **Data Corruption**: Restore dari backup terakhir
2. **Calculation Errors**: Re-run bulk calculation untuk periode tertentu
3. **Performance Degradation**: Clear cache dan restart service
4. **Database Issues**: Failover ke replica set

### Rate Limiting
The API implements rate limiting to prevent abuse and ensure fair usage:

#### Profile Image Endpoints
- **Upload**: 5 uploads per 15 minutes per user
- **Get**: 20 requests per 5 minutes per user
- **Delete**: 5 deletes per 15 minutes per user
- **Update Metadata**: 10 updates per 15 minutes per user

#### General API Endpoints
- **Authentication**: 10 login attempts per 15 minutes per IP
- **Schedule**: 100 requests per 15 minutes per user
- **Attendance**: 50 requests per 15 minutes per user
- **Cron Management**: 20 requests per 15 minutes per user

#### Rate Limit Headers
When rate limits are applied, the following headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
Retry-After: 900
```

### Security Headers
The API includes security headers in all responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### Input Validation
- All input data is validated and sanitized
- File uploads are restricted by type and size
- SQL injection protection through parameterized queries
- XSS protection through input sanitization

### Authentication Endpoints

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "uid": "your_uid",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "uid": "user123",
      "name": "John Doe",
      "email": "john@example.com",
      "location": "Jakarta"
    },
    "expiresIn": "7d"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

**Alternative method:**
```http
GET /api/v1/auth/logout
Authorization: Bearer <token>
```

#### Verify Token
```http
GET /api/v1/auth/verify
Authorization: Bearer <token>
```

#### Get Auth Status
```http
GET /api/v1/auth/status
Authorization: Bearer <token>
```

## 👤 User Management

### Get User Profile
```http
GET /api/v1/users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "uid": "user123",
    "name": "John Doe",
    "position": "Staff",
    "email": "john@example.com",
    "location": "Jakarta",
    "profileImage": {
      "original": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg",
      "thumbnail": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-150,h-150,c-maintain_ratio,q-80",
      "small": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-300,h-300,c-maintain_ratio,q-80",
      "medium": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-600,h-600,c-maintain_ratio,q-80"
    },
    "schedule": [...],
    "metadata": {
      "totalScheduledDays": 22,
      "lastLoginAt": "2025-01-15T10:30:00.000Z",
      "accountCreatedAt": "2025-01-01T00:00:00.000Z",
      "profileUpdatedAt": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

### Get User Profile (Alternative Endpoint)
```http
GET /api/v1/user/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "uid": "user_123456",
    "name": "Anggi Firmansyah",
    "email": "anggi@example.com",
    "employee_id": "2405047",
    "position": "Staff",
    "department": "IT",
    "profileImage": "https://ik.imagekit.io/example/profile_abc123.jpg",
    "profileImageThumbnail": "https://ik.imagekit.io/example/profile_abc123_thumbnail.jpg",
    "profileImageVariants": {
      "thumbnail": "https://ik.imagekit.io/example/profile_abc123_thumbnail.jpg",
      "small": "https://ik.imagekit.io/example/profile_abc123_small.jpg",
      "medium": "https://ik.imagekit.io/example/profile_abc123_medium.jpg",
      "original": "https://ik.imagekit.io/example/profile_abc123.jpg"
    },
    "profileImageMeta": {
      "alt": "Profile picture of Anggi Firmansyah",
      "caption": "My profile photo"
    },
    "createdAt": "2025-01-15T08:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### Update User Profile
```http
PUT /api/v1/users/me
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "John Smith",
  "email": "johnsmith@example.com",
  "location": "Bandung"
}
```

### Update User Profile (Alternative Endpoint)
```http
PUT /api/v1/user/profile
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Anggi Firmansyah Updated",
  "position": "Senior Staff",
  "department": "IT Development"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "uid": "user_123456",
    "name": "Anggi Firmansyah Updated",
    "email": "anggi@example.com",
    "employee_id": "2405047",
    "position": "Senior Staff",
    "department": "IT Development",
    "updatedAt": "2025-01-15T10:35:00.000Z"
  }
}
```

### Get User Statistics
```http
GET /api/v1/users/me/stats
Authorization: Bearer <token>
```

### Get User Statistics (Alternative Endpoint)
```http
GET /api/v1/user/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "User statistics retrieved successfully",
  "data": {
    "uid": "user_123456",
    "employee_id": "2405047",
    "statistics": {
      "total_scheduled_days": 156,
      "current_month_days": 22,
      "attendance_summary": {
        "present": 145,
        "absent": 8,
        "late": 3,
        "attendance_rate": 92.9
      },
      "shift_distribution": {
        "Pagi": 65,
        "Siang": 52,
        "Malam": 39
      },
      "monthly_breakdown": [
        {
          "month": 8,
          "year": 2025,
          "scheduled_days": 23,
          "present_days": 21,
          "attendance_rate": 91.3
        }
      ]
    },
    "period": {
      "start": "2025-01-01",
      "end": "2025-08-31"
    },
    "last_updated": "2025-01-15T10:30:00.000Z"
  }
}
```

## 🖼️ Profile Image Management

### Upload Profile Image
```http
POST /api/v1/users/profile/image/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- profileImage: <image-file> (JPEG, PNG, WebP, max 10MB)
```

**Rate Limit:** 5 uploads per 15 minutes per user

**Response:**
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "data": {
    "user": {
      "uid": "user123",
      "name": "John Doe",
      "profileImage": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg",
      "profileImageThumbnail": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-150,h-150,c-maintain_ratio,q-80,f-webp"
    },
    "imageVariants": {
      "original": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg",
      "thumbnail": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-150,h-150,c-maintain_ratio,q-80",
      "small": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-300,h-300,c-maintain_ratio,q-80",
      "medium": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-600,h-600,c-maintain_ratio,q-80"
    },
    "uploadInfo": {
      "originalFileName": "profile.jpg",
      "fileSize": 2048576,
      "mimeType": "image/jpeg",
      "fileId": "imagekit_file_id_123"
    }
  }
}
```

### Upload Profile Image (Alternative Endpoint)
```http
POST /api/v1/profile/image/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
- `profileImage`: Image file (JPEG, PNG, WebP - Max 10MB)
- `alt`: Alternative text for the image (optional)
- `caption`: Caption for the image (optional)

**Rate Limit:** 5 uploads per 15 minutes per user

**Response:**
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "data": {
    "uid": "user_123456",
    "name": "Anggi Firmansyah",
    "email": "anggi@example.com",
    "profileImage": "https://ik.imagekit.io/example/profile_abc123.jpg",
    "profileImageThumbnail": "https://ik.imagekit.io/example/profile_abc123_thumbnail.jpg",
    "profileImageVariants": {
      "thumbnail": "https://ik.imagekit.io/example/profile_abc123_thumbnail.jpg",
      "small": "https://ik.imagekit.io/example/profile_abc123_small.jpg",
      "medium": "https://ik.imagekit.io/example/profile_abc123_medium.jpg",
      "original": "https://ik.imagekit.io/example/profile_abc123.jpg"
    },
    "profileImageMeta": {
      "alt": "Profile picture of Anggi Firmansyah",
      "caption": "My new profile photo"
    },
    "uploadInfo": {
      "fileId": "abc123xyz789",
      "fileName": "profile_abc123.jpg",
      "fileSize": 2048576,
      "uploadedAt": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

### Get Profile Image
```http
GET /api/v1/users/profile/image?size=thumbnail
Authorization: Bearer <token>
```

**Query Parameters:**
- `size` (optional): `thumbnail`, `small`, `medium`, `original`

**Rate Limit:** 20 requests per 5 minutes

### Get Profile Image (Alternative Endpoint)
```http
GET /api/v1/profile/image?size=thumbnail
Authorization: Bearer <token>
```

**Query Parameters:**
- `size` (optional): `thumbnail`, `small`, `medium`, `original`

**Response:**
```json
{
  "success": true,
  "message": "Profile image retrieved successfully",
  "data": {
    "uid": "user_123456",
    "profileImage": "https://ik.imagekit.io/example/profile_abc123.jpg",
    "profileImageThumbnail": "https://ik.imagekit.io/example/profile_abc123_thumbnail.jpg",
    "profileImageVariants": {
      "thumbnail": "https://ik.imagekit.io/example/profile_abc123_thumbnail.jpg",
      "small": "https://ik.imagekit.io/example/profile_abc123_small.jpg",
      "medium": "https://ik.imagekit.io/example/profile_abc123_medium.jpg",
      "original": "https://ik.imagekit.io/example/profile_abc123.jpg"
    },
    "profileImageMeta": {
      "alt": "Profile picture of Anggi Firmansyah",
      "caption": "My profile photo"
    },
    "requestedSize": "thumbnail",
    "imageUrl": "https://ik.imagekit.io/example/profile_abc123_thumbnail.jpg"
  }
}
```

**Rate Limit:** 20 requests per 5 minutes

### Delete Profile Image
```http
DELETE /api/v1/users/profile/image
Authorization: Bearer <token>
```

**Rate Limit:** 5 deletes per 15 minutes per user

### Delete Profile Image (Alternative Endpoint)
```http
DELETE /api/v1/profile/image
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile image deleted successfully",
  "data": {
    "uid": "user_123456",
    "name": "Anggi Firmansyah",
    "profileImage": null,
    "profileImageThumbnail": null,
    "profileImageVariants": null,
    "profileImageMeta": null,
    "deletedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Rate Limit:** 5 deletes per 15 minutes per user

### Update Profile Image Metadata
```http
PUT /api/v1/users/profile/image/meta
Content-Type: application/json
Authorization: Bearer <token>

{
  "alt": "Profile picture of John Doe",
  "caption": "My latest profile photo"
}
```

### Update Profile Image Metadata (Alternative Endpoint)
```http
PUT /api/v1/profile/image/meta
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "alt": "Profile picture of Anggi Firmansyah",
  "caption": "My updated profile photo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile image metadata updated successfully",
  "data": {
    "uid": "user_123456",
    "name": "Anggi Firmansyah",
    "profileImageMeta": {
      "alt": "Profile picture of Anggi Firmansyah",
      "caption": "My updated profile photo"
    },
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### Get Profile Image by User ID (Public)
```http
GET /api/v1/users/profile/image/user/:userId?size=thumbnail
```

**Note:** This endpoint doesn't require authentication and is publicly accessible.

### Get Profile Image by User ID (Alternative Public Endpoint)
```http
GET /api/v1/profile/image/user/:userId?size=thumbnail
```

**Parameters:**
- `userId`: User ID or UID
- `size` (optional): `thumbnail`, `small`, `medium`, `original`

**Response:**
```json
{
  "success": true,
  "message": "Profile image retrieved successfully",
  "data": {
    "uid": "user_123456",
    "name": "Anggi Firmansyah",
    "profileImage": "https://ik.imagekit.io/example/profile_abc123.jpg",
    "profileImageThumbnail": "https://ik.imagekit.io/example/profile_abc123_thumbnail.jpg",
    "profileImageVariants": {
      "thumbnail": "https://ik.imagekit.io/example/profile_abc123_thumbnail.jpg",
      "small": "https://ik.imagekit.io/example/profile_abc123_small.jpg",
      "medium": "https://ik.imagekit.io/example/profile_abc123_medium.jpg",
      "original": "https://ik.imagekit.io/example/profile_abc123.jpg"
    },
    "requestedSize": "thumbnail",
    "imageUrl": "https://ik.imagekit.io/example/profile_abc123_thumbnail.jpg"
  }
}
```

**Note:** This endpoint doesn't require authentication and is publicly accessible.

## 📅 Schedule Management

### Upload Excel Schedule
```http
POST /api/v1/schedule/upload-excel
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- file: <excel-file>
```

### Get All Schedules
```http
GET /api/v1/schedule/all
Authorization: Bearer <token>
```

### Search Schedules by Name
```http
GET /api/v1/schedule/search?name=John
Authorization: Bearer <token>
```

### Get Employee Schedule
```http
GET /api/v1/schedule/:employeeId
Authorization: Bearer <token>
```

**Parameters:**
- `employeeId`: Employee ID (e.g., "2405047")

### Filter Schedule by Month
```http
GET /api/v1/schedule/:employeeId/filter?month=7&year=2025
Authorization: Bearer <token>
```

**Parameters:**
- `employeeId`: Employee ID (required)
- `month`: Month number 1-12 (required)
- `year`: Year in YYYY format (required)

**Response:**
```json
{
  "success": true,
  "message": "Schedule retrieved successfully for 7/2025",
  "data": {
    "employee_id": "2405047",
    "name": "Anggi Firmansyah",
    "position": "Staff",
    "department": "IT",
    "filter": {
      "month": 7,
      "year": 2025,
      "month_name": "July",
      "total_days": 22
    },
    "statistics": {
      "total_scheduled_days": 22,
      "shift_distribution": {
        "Pagi": 10,
        "Siang": 8,
        "Malam": 4
      },
      "working_days_in_month": 31
    },
    "schedule": [
      {
        "date": "2025-07-01",
        "shift": "Pagi"
      },
      {
        "date": "2025-07-02",
        "shift": "Siang"
      }
    ]
  }
}
```

### Get Current Month Schedule
```http
GET /api/v1/schedule/:employeeId/current-month
Authorization: Bearer <token>
```

**Parameters:**
- `employeeId`: Employee ID (required)

### Get Available Months
```http
GET /api/v1/schedule/:employeeId/available-months
Authorization: Bearer <token>
```

**Parameters:**
- `employeeId`: Employee ID (required)

**Response:**
```json
{
  "success": true,
  "message": "Available months retrieved successfully",
  "data": {
    "employee_id": "2405047",
    "available_months": [
      {
        "year": 2025,
        "month": 8,
        "month_name": "August",
        "total_days": 23,
        "period": {
          "start": "2025-08-01",
          "end": "2025-08-31"
        }
      },
      {
        "year": 2025,
        "month": 7,
        "month_name": "July",
        "total_days": 22,
        "period": {
          "start": "2025-07-01",
          "end": "2025-07-31"
        }
      }
    ],
    "total_months": 2
  }
}
```

### Filter Schedule by Date Range
```http
GET /api/v1/schedule/:employeeId/date-range?start_date=2025-07-01&end_date=2025-07-31
Authorization: Bearer <token>
```

**Parameters:**
- `employeeId`: Employee ID (required)
- `start_date`: Start date in YYYY-MM-DD format (required)
- `end_date`: End date in YYYY-MM-DD format (required)

**Response:**
```json
{
  "success": true,
  "message": "Schedule retrieved successfully for 7/2025",
  "data": {
    "employee_id": "2405047",
    "name": "John Doe",
    "position": "Staff",
    "department": "IT",
    "filter": {
      "month": 7,
      "year": 2025,
      "month_name": "July",
      "total_days": 22
    },
    "statistics": {
      "total_scheduled_days": 22,
      "shift_distribution": {
        "Pagi": 10,
        "Siang": 8,
        "Malam": 4
      },
      "working_days_in_month": 31
    },
    "schedule": [
      {
        "date": "2025-07-01",
        "shift": "Pagi"
      }
    ]
  }
}
```

### Get Current Month Schedule
```http
GET /api/v1/schedule/:employeeId/current-month
Authorization: Bearer <token>
```

### Get Available Months
```http
GET /api/v1/schedule/:employeeId/available-months
Authorization: Bearer <token>
```

### Get Schedule by Date Range
```http
GET /api/v1/schedule/:employeeId/date-range?start_date=2025-07-01&end_date=2025-07-31
Authorization: Bearer <token>
```

## 🕒 Attendance Management

### Fetch All Attendance Data (Asynchronous Processing)
```http
POST /api/v1/attendance/fetch-all
Authorization: Bearer <token>
```

**Response (HTTP 202 Accepted):**
```json
{
  "success": true,
  "message": "Attendance fetch process started",
  "data": {
    "jobId": "job_abc123_xyz789",
    "message": "Process is running in background. Use /api/v1/attendance/job-status/:jobId to check progress"
  },
  "timestamp": "2025-08-23T14:45:00.476Z"
}
```

**Note:** This endpoint now uses asynchronous processing to prevent timeout errors. The process runs in the background and returns immediately with a job ID for status tracking.

### Check Job Status
```http
GET /api/v1/attendance/job-status/:jobId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Job status retrieved",
  "data": {
    "id": "job_abc123_xyz789",
    "type": "attendance-fetch",
    "status": "running", // "pending", "running", "completed", "failed"
    "triggeredBy": "manual",
    "createdAt": "2025-08-23T14:45:00.476Z",
    "updatedAt": "2025-08-23T14:45:30.123Z",
    "progress": {
      "currentBatch": 5,
      "totalBatches": 10,
      "processedUsers": 25,
      "totalUsers": 50
    },
    "result": null // Will contain results when completed
  },
  "timestamp": "2025-08-23T14:46:00.000Z"
}
```

### Get All Jobs
```http
GET /api/v1/attendance/jobs
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Jobs retrieved",
  "data": {
    "jobs": [
      {
        "id": "job_abc123_xyz789",
        "type": "attendance-fetch",
        "status": "completed",
        "triggeredBy": "manual",
        "createdAt": "2025-08-23T14:45:00.476Z",
        "updatedAt": "2025-08-23T14:47:30.123Z",
        "duration": 150000
      }
    ],
    "stats": {
      "total": 1,
      "running": 0,
      "completed": 1,
      "failed": 0
    }
  },
  "timestamp": "2025-08-23T14:48:00.000Z"
}
```

### Fetch User Attendance
```http
GET /api/v1/attendance/fetch/:employeeId
Authorization: Bearer <token>
```

### Get Attendance by Filter
```http
GET /api/v1/attendance/:employeeId/filter?date=15&month=1&year=2025
Authorization: Bearer <token>
```

### Image Migration

#### Start Migration
```http
POST /api/v1/attendance/migrate-images?limit=50&skip=0&forceUpdate=false
Authorization: Bearer <token>
```

#### Get Migration Stats
```http
GET /api/v1/attendance/migration-stats
Authorization: Bearer <token>
```

## 🕐 Cron Job Management

### Get Cron Jobs Status
```http
GET /api/v1/cron/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Cron jobs status retrieved successfully",
  "data": {
    "jobs": {
      "attendanceFetch": {
        "name": "Night attendance fetch",
        "schedule": "0 8 * * 1-5",
        "timezone": "Asia/Jakarta",
        "running": true,
        "lastRun": "2025-01-15T08:00:00.000Z",
        "nextRun": "2025-01-16T08:00:00.000Z"
      }
    },
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

### Manually Trigger Attendance Fetch
```http
POST /api/v1/cron/trigger/attendance-fetch
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance fetch triggered successfully",
  "data": {
    "result": {
      "jobId": "job_abc123_xyz789",
      "status": "started",
      "type": "attendance-fetch"
    },
    "triggeredAt": "2025-01-15T10:30:00.000Z",
    "requestId": "req_123456"
  }
}
```

### Start Specific Cron Job
```http
POST /api/v1/cron/start/:jobName
Authorization: Bearer <token>
```

**Parameters:**
- `jobName`: Name of the cron job to start (e.g., "attendanceFetch")

**Response:**
```json
{
  "success": true,
  "message": "Job 'attendanceFetch' started successfully",
  "data": {
    "jobName": "attendanceFetch",
    "action": "started",
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

### Stop Specific Cron Job
```http
POST /api/v1/cron/stop/:jobName
Authorization: Bearer <token>
```

**Parameters:**
- `jobName`: Name of the cron job to stop (e.g., "attendanceFetch")

**Response:**
```json
{
  "success": true,
  "message": "Job 'attendanceFetch' stopped successfully",
  "data": {
    "jobName": "attendanceFetch",
    "action": "stopped",
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

### Get Cron Configuration
```http
GET /api/v1/cron/config
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Cron configuration retrieved successfully",
  "data": {
    "attendanceFetch": {
      "schedule": "0 8 * * 1-5",
      "timezone": "Asia/Jakarta",
      "enabled": true,
      "description": "Fetch attendance data for all employees"
    },
    "environment": {
      "NODE_ENV": "development",
      "BASE_URL": "http://localhost:5000"
    }
  }
}
```

## ⚡ Asynchronous Processing

The application implements asynchronous processing for long-running operations to prevent HTTP timeout errors and improve user experience. This is particularly important for attendance data fetching operations that may take several minutes to complete.

### Key Features

#### Background Job Processing
- **Immediate Response**: API endpoints return immediately with HTTP 202 (Accepted) status
- **Job Tracking**: Each background process gets a unique job ID for status monitoring
- **Progress Monitoring**: Real-time progress updates with batch processing information
- **Status Management**: Track job states (pending, running, completed, failed)

#### Job Queue System
- **In-Memory Queue**: Lightweight job queue for tracking active processes
- **Duplicate Prevention**: Prevents multiple instances of the same job type
- **Job Statistics**: Comprehensive statistics on job execution
- **Error Handling**: Proper error tracking and reporting for failed jobs

#### Polling-Based Status Checking
- **Real-time Updates**: Check job status and progress at any time
- **Timeout Management**: Automatic job timeout after 10 minutes
- **Result Storage**: Job results are stored and retrievable after completion

### Implementation Details

#### Attendance Fetch Process
When `/api/v1/attendance/fetch-all` is called:
1. **Immediate Response**: Returns HTTP 202 with job ID
2. **Background Processing**: Starts attendance fetching in background
3. **Batch Processing**: Processes users in batches of 5 for optimal performance
4. **Progress Updates**: Updates job progress after each batch
5. **Completion**: Marks job as completed with final results

#### Cron Service Integration
The cron service has been updated to handle asynchronous responses:
- **Reduced Timeout**: HTTP requests timeout reduced to 10 seconds
- **Job Polling**: Polls job status every 5 seconds until completion
- **Maximum Wait Time**: 10-minute maximum wait time for job completion
- **Error Recovery**: Proper error handling for job failures

### Usage Examples

#### Starting a Background Job
```bash
# Start attendance fetch process
curl -X POST "http://localhost:5000/api/v1/attendance/fetch-all" \
  -H "Authorization: Bearer <token>"

# Response: HTTP 202 Accepted
{
  "success": true,
  "message": "Attendance fetch process started",
  "data": {
    "jobId": "job_abc123_xyz789",
    "message": "Process is running in background"
  }
}
```

#### Monitoring Job Progress
```bash
# Check job status
curl "http://localhost:5000/api/v1/attendance/job-status/job_abc123_xyz789" \
  -H "Authorization: Bearer <token>"

# Response: Current job status
{
  "success": true,
  "data": {
    "status": "running",
    "progress": {
      "currentBatch": 3,
      "totalBatches": 10,
      "processedUsers": 15,
      "totalUsers": 50
    }
  }
}
```

#### Getting All Jobs
```bash
# List all jobs
curl "http://localhost:5000/api/v1/attendance/jobs" \
  -H "Authorization: Bearer <token>"

# Response: All jobs with statistics
{
  "success": true,
  "data": {
    "jobs": [...],
    "stats": {
      "total": 5,
      "running": 1,
      "completed": 3,
      "failed": 1
    }
  }
}
```

## ⏰ Automated Cron Jobs

The application includes automated cron job functionality to periodically fetch attendance data from external APIs. This ensures that attendance records are kept up-to-date without manual intervention.

### Cron Job Configuration

Cron jobs are configured through environment variables in your `.env` file:

```bash
# Cron Job Configuration
ATTENDANCE_CRON_ENABLED=true
ATTENDANCE_CRON_SCHEDULE=0 7,8,13,18 * * *
ATTENDANCE_CRON_SCHEDULE_NIGHT=50 23 * * *
ATTENDANCE_CRON_TIMEZONE=Asia/Jakarta

# Cron Authentication (required for API access)
CRON_USERNAME=your-cron-username
CRON_PASSWORD=your-cron-password
```

### Environment Variables Explanation

| Variable | Description | Example |
|----------|-------------|----------|
| `ATTENDANCE_CRON_ENABLED` | Enable/disable cron jobs | `true` or `false` |
| `ATTENDANCE_CRON_SCHEDULE` | Main cron schedule (multiple times) | `0 7,8,13,18 * * *` |
| `ATTENDANCE_CRON_SCHEDULE_NIGHT` | Night schedule (separate timing) | `50 23 * * *` |
| `ATTENDANCE_CRON_TIMEZONE` | Timezone for cron execution | `Asia/Jakarta` |
| `CRON_USERNAME` | Username for cron authentication | `admin` |
| `CRON_PASSWORD` | Password for cron authentication | `secure-password` |

### Default Schedule

By default, the cron jobs are configured to run at:
- **07:00** - Morning attendance fetch
- **08:00** - Early morning attendance fetch
- **13:00** - Afternoon attendance fetch
- **18:00** - Evening attendance fetch
- **23:50** - Late night attendance fetch

All times are in the configured timezone (`Asia/Jakarta` by default).

### Cron Schedule Format

The cron schedule uses the standard cron format:
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

**Examples:**
- `0 8 * * 1-5` - Every weekday at 8:00 AM
- `30 14 * * *` - Every day at 2:30 PM
- `0 */6 * * *` - Every 6 hours
- `0 9,17 * * 1-5` - Weekdays at 9:00 AM and 5:00 PM

### Cron Job Features

#### Automatic Authentication
- Cron jobs automatically authenticate using configured credentials
- JWT tokens are managed internally for API access
- No manual token management required

#### Batch Processing
- Processes attendance data in configurable batches
- Handles large datasets efficiently
- Provides detailed processing statistics

#### Error Handling
- Comprehensive error logging and reporting
- Automatic retry mechanisms for failed requests
- Graceful handling of API timeouts and network issues

#### Monitoring and Logging
- Detailed execution logs with timestamps
- Success/failure statistics for each run
- Performance metrics and processing times

### Cron Job Logs

Cron job execution is logged with detailed information:

```
2025-01-15 07:00:01 [INFO] Attendance cron job started (main schedule)
2025-01-15 07:00:02 [INFO] Authenticating cron user...
2025-01-15 07:00:03 [INFO] Authentication successful, token obtained
2025-01-15 07:00:04 [INFO] Starting attendance fetch process...
2025-01-15 07:00:05 [INFO] Processing batch 1/10...
2025-01-15 07:00:15 [INFO] Batch 1/10 completed: 5 success, 0 failed
2025-01-15 07:01:30 [INFO] Attendance fetch completed: 48/50 successful
2025-01-15 07:01:31 [INFO] Attendance cron job finished successfully
```

### Manual Cron Trigger

You can manually trigger the attendance fetch process using the API:

```http
POST /api/v1/attendance/fetch-all
Authorization: Bearer <token>
```

This endpoint performs the same operation as the automated cron job.

### Deployment Considerations

#### Railway Deployment
When deploying to Railway:
1. Set all cron environment variables in Railway dashboard
2. **Important**: Set `NODE_ENV=production` for proper URL detection
3. **Important**: Set `BASE_URL` to your Railway app URL (e.g., `https://your-app.up.railway.app`)
4. Cron jobs will start automatically with the application
5. Railway supports IANA timezone names (e.g., `Asia/Jakarta`)
6. The application will automatically detect Railway environment and use HTTPS URLs

#### Docker Deployment
For Docker deployments:
1. Ensure timezone is properly set in container
2. Include all cron environment variables in docker-compose or run command
3. Consider using volume mounts for persistent logs

#### Production Setup
```bash
# Production environment variables
ATTENDANCE_CRON_ENABLED=true
ATTENDANCE_CRON_SCHEDULE=0 7,8,13,18 * * *
ATTENDANCE_CRON_SCHEDULE_NIGHT=50 23 * * *
ATTENDANCE_CRON_TIMEZONE=Asia/Jakarta
CRON_USERNAME=production-cron-user
CRON_PASSWORD=secure-production-password
```

### Troubleshooting

#### Common Issues

**Cron jobs not running:**
- Check `ATTENDANCE_CRON_ENABLED=true`
- Verify cron schedule format
- Check application logs for errors

**Authentication failures:**
- Verify `CRON_USERNAME` and `CRON_PASSWORD`
- Ensure credentials have proper permissions
- Check if user account is active

**Timezone issues:**
- Use IANA timezone names (e.g., `Asia/Jakarta`)
- Verify server timezone configuration
- Check cron execution logs for actual run times

**Railway deployment issues:**
- Ensure `NODE_ENV=production` is set in Railway dashboard
- Set `BASE_URL` to your Railway app URL (e.g., `https://your-app.up.railway.app`)
- Check Railway logs for cron initialization messages
- Verify all environment variables are properly set without quotes
- Make sure cron jobs show `running: true` in status endpoint

#### Monitoring Cron Jobs

1. **Check application logs** for cron execution details
2. **Monitor API endpoints** for successful attendance fetches
3. **Set up alerts** for cron job failures
4. **Review processing statistics** regularly

### Customization

To customize cron job behavior:

1. **Modify schedules** by updating environment variables
2. **Add new cron jobs** by extending the `CronService` class
3. **Customize batch sizes** in the attendance service
4. **Add custom notifications** for cron job results

### Security Considerations

- Store cron credentials securely in environment variables
- Use strong passwords for cron authentication
- Regularly rotate cron user credentials
- Monitor cron job logs for suspicious activity
- Limit cron user permissions to minimum required

## 🏥 Health & Monitoring

### Basic Health Check
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Health check passed",
  "data": {
    "success": true,
    "message": "Server is running",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "uptime": 3600,
    "environment": "development",
    "version": "2.0.0",
    "mongodb_connected": true,
    "memory_usage": {...}
  }
}
```

### Detailed Health Check
```http
GET /health/detailed
```

## 🔧 Error Handling

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {...},
  "meta": {...},
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "statusCode": 400,
  "details": {...},
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Common Error Codes

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | VALIDATION_ERROR | Input validation failed |
| 401 | UNAUTHENTICATED | No valid token provided |
| 401 | TOKEN_EXPIRED | JWT token has expired |
| 403 | ACCESS_DENIED | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | DUPLICATE_ERROR | Resource already exists |
| 409 | JOB_ALREADY_RUNNING | Background job is already running |
| 404 | JOB_NOT_FOUND | Background job not found |
| 408 | JOB_TIMEOUT | Background job exceeded timeout limit |
| 500 | JOB_FAILED | Background job execution failed |
| 413 | FILE_TOO_LARGE | Uploaded file exceeds size limit |
| 415 | INVALID_FILE_TYPE | File type not supported |
| 422 | UPLOAD_FAILED | Image upload to ImageKit failed |
| 404 | IMAGE_NOT_FOUND | Profile image not found |
| 500 | DELETE_FAILED | Failed to delete image from ImageKit |
| 400 | INVALID_IMAGE_METADATA | Invalid alt text or caption provided |
| 413 | IMAGE_SIZE_EXCEEDED | Image file size exceeds maximum limit |
| 415 | UNSUPPORTED_IMAGE_FORMAT | Image format not supported |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 502 | EXTERNAL_API_ERROR | External service error |
| 503 | SERVICE_UNAVAILABLE | Service temporarily down |

## 📝 Logging

The application uses structured logging with different levels:

- **error**: System errors and exceptions
- **warn**: Warning conditions
- **info**: General information
- **debug**: Debug information (development only)

### Log Format
```json
{
  "timestamp": "2025-01-15 10:30:00",
  "level": "info",
  "message": "User login successful",
  "service": "jadwal-api",
  "uid": "user123",
  "requestId": "req-abc123"
}
```

## 🚀 Deployment

### Docker Deployment

1. **Create Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

USER node

CMD ["npm", "start"]
```

2. **Build and run:**
```bash
docker build -t jadwal-api .
docker run -p 5000:5000 --env-file .env jadwal-api
```

### Railway Deployment

1. **Create railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
```

2. **Environment Variables:**
Set all required environment variables in Railway dashboard.

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure proper MongoDB connection string
- [ ] Set secure JWT secret (minimum 32 characters)
- [ ] Configure CORS origins for your domain
- [ ] Set up proper SSL/TLS certificates
- [ ] Configure rate limiting appropriately
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up database backups
- [ ] Configure ImageKit for production

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

### Test Structure
```
tests/
├── unit/
│   ├── controllers/
│   ├── services/
│   └── utils/
├── integration/
│   ├── auth.test.js
│   ├── schedule.test.js
│   └── attendance.test.js
└── fixtures/
    └── sample-data.json
```

## 📊 Performance Optimization

### Caching Strategy
- **User profiles**: 30 minutes TTL
- **Schedule data**: 1 hour TTL
- **Attendance data**: 5 minutes TTL
- **Health checks**: 1 minute TTL

### Database Optimization
- **Indexes**: Proper indexing on frequently queried fields
- **Connection Pooling**: Optimized MongoDB connections
- **Query Optimization**: Efficient aggregation pipelines

### Image Processing
- **Batch Processing**: Process images in small batches
- **Error Recovery**: Fallback to original URLs on failure
- **Timeout Management**: Proper timeout handling
- **Retry Logic**: Automatic retry on transient failures

## 🔒 Security Best Practices

### Implemented Security Features
- **Helmet**: Security headers
- **Rate Limiting**: Protection against brute force
- **JWT Security**: Proper token validation
- **Input Validation**: Joi-based validation
- **CORS Configuration**: Restricted origins
- **Error Handling**: No sensitive data exposure

### Security Checklist
- [ ] Regular security audits (`npm audit`)
- [ ] Keep dependencies updated
- [ ] Use HTTPS in production
- [ ] Implement proper logging
- [ ] Monitor for suspicious activity
- [ ] Regular backup verification
- [ ] Access control reviews

## 🛠️ Development

### Code Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middlewares/     # Express middlewares
├── models/         # Database models
├── routes/         # Route definitions
├── services/       # Business logic services
├── utils/          # Utility functions
└── app.ts         # Main application file
```

### Development Workflow
1. **Feature Branch**: Create feature branch from main
2. **Development**: Write code with tests
3. **Testing**: Run all tests locally
4. **Code Review**: Submit pull request
5. **Integration**: Merge after review and tests pass
6. **Deployment**: Deploy to staging then production

### Code Style
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **TypeScript**: Static type checking

## 📈 Monitoring & Observability

### Metrics to Monitor
- **Response Times**: API endpoint performance
- **Error Rates**: 4xx and 5xx response rates
- **Database Performance**: Query execution times
- **Memory Usage**: Heap and RSS memory
- **External API Health**: Third-party service availability

### Recommended Tools
- **Application Monitoring**: New Relic, DataDog, or AppDynamics
- **Log Management**: ELK Stack or Splunk
- **Uptime Monitoring**: Pingdom or UptimeRobot
- **Error Tracking**: Sentry or Bugsnag

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- **Email**: support@yourcompany.com
- **Documentation**: https://docs.yourapi.com
- **Issue Tracker**: https://github.com/yourrepo/issues

## 🎯 Roadmap

### Version 2.1 (Planned)
- [ ] Real-time notifications with WebSocket
- [ ] Advanced reporting and analytics
- [ ] Role-based access control (RBAC)
- [ ] Multi-language support
- [ ] Mobile app API endpoints
- [ ] Bulk image operations
- [ ] Image compression settings

### Version 2.0 (Current)
- [x] Profile image upload and management
- [x] ImageKit integration
- [x] Multiple image size variants
- [x] Image metadata support
- [x] Rate limiting for uploads
- [x] Enhanced JWT authentication
- [x] Class-based controllers
- [x] Service layer pattern
- [x] Comprehensive error handling
- [x] Winston logging system
- [x] Caching layer implementation
- [x] Automated cron jobs for attendance fetching
- [x] Cron job authentication and scheduling
- [x] Multiple cron schedules support
- [x] **Asynchronous processing for long-running operations**
- [x] **Background job queue system with status tracking**
- [x] **Real-time job progress monitoring**
- [x] **HTTP timeout prevention for attendance fetch operations**

### Version 2.2 (Future)
- [ ] GraphQL API support
- [ ] Microservices architecture
- [ ] Event-driven architecture
- [ ] Advanced caching with Redis
- [ ] Machine learning integration
- [ ] Image metadata search
- [ ] Profile image history

---

**Made with ❤️ by the Development Team**