export const API_ENDPOINTS = {
    ATTENDANCE_API_BASE: 'http://attendance-api.shabuhachi.id/service',
    ATTENDANCE_GET_TRIP_REPORT: 'getTripReport1.php',
    ATTENDANCE_CHECK_LOGIN: 'check_login1.php'
  } as const;
  
  export const PAGINATION_DEFAULTS = {
    PAGE: 1,
    LIMIT: 20,
    MAX_LIMIT: 100
  } as const;
  
  export const FILE_UPLOAD = {
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_EXCEL_TYPES: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
  } as const;
  
  export const IMAGE_PROCESSING = {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    BATCH_SIZE: 5,
    TIMEOUT: 30000, // 30 seconds
    SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'webp']
  } as const;
  
  export const CACHE_TTL = {
  SCHEDULE: 3600, // 1 hour
  USER_PROFILE: 1800, // 30 minutes
  ATTENDANCE: 300, // 5 minutes
  HEALTH_CHECK: 60 // 1 minute
} as const;

// Konfigurasi jam kerja berdasarkan shift angka yang spesifik
export const SHIFT_SCHEDULES = {
  '7': {
    start_time: '07:00:00',
    end_time: '17:00:00', // 10 jam kerja
    break_duration_minutes: 60,
    tolerance_minutes: 0,
    category: 'Pagi'
  },
  '8': {
    start_time: '08:00:00',
    end_time: '18:00:00', // 10 jam kerja
    break_duration_minutes: 60,
    tolerance_minutes: 0,
    category: 'Pagi'
  },
  '9': {
    start_time: '09:00:00',
    end_time: '19:00:00', // 10 jam kerja
    break_duration_minutes: 60,
    tolerance_minutes: 0,
    category: 'Pagi'
  },
  '10': {
    start_time: '10:00:00',
    end_time: '20:00:00', // 10 jam kerja
    break_duration_minutes: 60,
    tolerance_minutes: 0,
    category: 'Middle'
  },
  '11': {
    start_time: '11:00:00',
    end_time: '21:00:00', // 10 jam kerja
    break_duration_minutes: 60,
    tolerance_minutes: 0,
    category: 'Middle'
  },
  '12': {
    start_time: '12:00:00',
    end_time: '22:00:00', // 10 jam kerja
    break_duration_minutes: 60,
    tolerance_minutes: 0,
    category: 'Siang'
  },
  '13': {
    start_time: '13:00:00',
    end_time: '23:00:00', // 10 jam kerja
    break_duration_minutes: 60,
    tolerance_minutes: 0,
    category: 'Siang'
  },
  // Fallback untuk nama shift (backward compatibility)
  'Pagi': {
    start_time: '08:00:00', // Default untuk kategori Pagi
    end_time: '18:00:00',
    break_duration_minutes: 60,
    tolerance_minutes: 0,
    category: 'Pagi'
  },
  'Middle': {
    start_time: '10:00:00', // Default untuk kategori Middle
    end_time: '20:00:00',
    break_duration_minutes: 60,
    tolerance_minutes: 0,
    category: 'Middle'
  },
  'Siang': {
    start_time: '12:00:00', // Default untuk kategori Siang
    end_time: '22:00:00',
    break_duration_minutes: 60,
    tolerance_minutes: 0,
    category: 'Siang'
  }
} as const;

export const LATENESS_STATUS = {
  ON_TIME: 'on_time',
  LATE: 'late',
  VERY_LATE: 'very_late',
  ABSENT: 'absent',
  OFF_DAY: 'off_day',
  EARLY_DEPARTURE: 'early_departure',
  LONG_BREAK: 'long_break'
} as const;

export const SCHEDULE_TYPES = {
  OFF: 'OFF',
  CT: 'CT', // Cuti
  PAGI: 'Pagi',
  MIDDLE: 'Middle',
  SIANG: 'Siang'
} as const;

// Mapping dari shift angka ke nama shift
export const SHIFT_NUMBER_MAPPING = {
  '7': 'Pagi',
  '8': 'Pagi', 
  '9': 'Pagi',
  '10': 'Middle',
  '11': 'Middle',
  '12': 'Siang',
  '13': 'Siang'
} as const;