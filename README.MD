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

### Profile Image Management
- **ImageKit Integration**: Cloud-based image processing and CDN delivery
- **Multiple Image Variants**: Automatic generation of thumbnail, small, medium, and original sizes
- **Image Optimization**: Automatic format conversion and quality optimization
- **Secure Upload**: Rate-limited uploads with file type and size validation
- **Metadata Management**: Support for alt text and captions

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **MongoDB** (v5.0 or higher)
- **Redis** (v6.0 or higher) - for caching
- **Git** - for version control

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

### Authentication Endpoints

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
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

#### Verify Token
```http
GET /api/v1/auth/verify
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

### Get User Statistics
```http
GET /api/v1/users/me/stats
Authorization: Bearer <token>
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

### Get Profile Image
```http
GET /api/v1/users/profile/image?size=thumbnail
Authorization: Bearer <token>
```

**Query Parameters:**
- `size` (optional): `thumbnail`, `small`, `medium`, `original`

**Rate Limit:** 20 requests per 5 minutes

### Delete Profile Image
```http
DELETE /api/v1/users/profile/image
Authorization: Bearer <token>
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

### Get Profile Image by User ID (Public)
```http
GET /api/v1/users/profile/image/user/:userId?size=thumbnail
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

### Filter Schedule by Month
```http
GET /api/v1/schedule/:employeeId/filter?month=7&year=2025
Authorization: Bearer <token>
```

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

### Fetch All Attendance
```http
POST /api/v1/attendance/fetch-all
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance fetch process completed",
  "data": {
    "processed": 50,
    "success": 48,
    "failed": 2,
    "total": 50,
    "date": "2025-01-15",
    "results": [...],
    "hasMoreResults": false
  }
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
2. Cron jobs will start automatically with the application
3. Railway supports IANA timezone names (e.g., `Asia/Jakarta`)
4. No additional configuration required

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
| 413 | FILE_TOO_LARGE | Uploaded file exceeds size limit |
| 415 | INVALID_FILE_TYPE | File type not supported |
| 422 | UPLOAD_FAILED | Image upload to ImageKit failed |
| 404 | IMAGE_NOT_FOUND | Profile image not found |
| 500 | DELETE_FAILED | Failed to delete image from ImageKit |
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