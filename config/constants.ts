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