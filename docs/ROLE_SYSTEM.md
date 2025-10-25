# Role-Based Access Control (RBAC) System

## Overview

Sistem ini mengimplementasikan Role-Based Access Control (RBAC) untuk membedakan antara user biasa dan admin. Sistem ini dirancang untuk bekerja dengan existing authentication flow dimana user data dibuat di MongoDB setelah user melakukan login pertama kali.

## Role Types

### UserRole Enum
```typescript
enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}
```

- **USER**: Role default untuk semua user baru
- **ADMIN**: Role untuk administrator dengan akses penuh

## Database Schema Changes

### User Model Updates

Field baru yang ditambahkan ke User schema:

```typescript
role: {
  type: String,
  enum: Object.values(UserRole),
  default: UserRole.USER,
  required: true,
  index: true
}
```

### New Methods

#### Instance Methods
- `isAdmin()`: Mengecek apakah user adalah admin
- `hasRole(role: UserRole)`: Mengecek apakah user memiliki role tertentu

#### Static Methods
- `findAdmins()`: Mencari semua admin users
- `findByRole(role: UserRole)`: Mencari users berdasarkan role
- `countByRole(role: UserRole)`: Menghitung jumlah users per role

## Authentication Flow

### 1. Login Process
Ketika user login, sistem akan:
1. Verifikasi token dari provider (Google/Microsoft)
2. Buat atau update user di database
3. Assign role default (USER) untuk user baru
4. Include role dalam JWT token payload
5. Return user data beserta role

### 2. JWT Token Payload
```typescript
interface TokenPayload {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;
  exp: number;
}
```

## Authorization Middleware

### 1. verifyTokenMiddleware
- Verifikasi JWT token
- Fetch user role dari database
- Attach user data + role ke request object

### 2. requireRole(allowedRoles: UserRole[])
- Mengecek apakah user memiliki salah satu dari role yang diizinkan
- Return 403 jika tidak memiliki akses

### 3. requireAdmin
- Shortcut untuk require ADMIN role
- Menggunakan `requireRole([UserRole.ADMIN])`

### 4. requireOwnership
- Mengecek ownership resource
- Admin dapat bypass ownership check
- Support untuk berbagai resource types

## Admin Management Endpoints

### Base URL: `/api/v1/admin`

#### 1. Get All Users
```
GET /users?page=1&limit=10&role=USER
```
- Pagination support
- Filter by role
- Admin only

#### 2. Get User Statistics
```
GET /stats
```
- Total users count
- Count by role
- Admin only

#### 3. Get User Details
```
GET /users/:uid
```
- Get specific user details
- Admin only

#### 4. Update User Role
```
PUT /users/:uid/role
Body: { "role": "ADMIN" }
```
- Update user role
- Admin only
- Cannot change own role

#### 5. Promote to Admin
```
POST /users/:uid/promote
```
- Promote user to admin
- Admin only

#### 6. Demote from Admin
```
POST /users/:uid/demote
```
- Demote admin to user
- Admin only
- Cannot demote self

#### 7. Delete User
```
DELETE /users/:uid
```
- Soft delete user
- Admin only
- Cannot delete self

## Migration Strategy

### For Existing Users

Gunakan migration script untuk existing users:

```bash
# Check current statistics
npm run migrate:roles stats

# Dry run migration
npm run migrate:roles migrate --dry-run

# Run actual migration
npm run migrate:roles migrate

# Promote specific users to admin
npm run migrate:roles promote user123 user456

# Rollback if needed (removes all role fields)
npm run migrate:roles rollback --confirm
```

### Migration Script Features

1. **Safe Migration**: Dry run mode untuk testing
2. **Statistics**: Lihat current state sebelum migration
3. **Selective Promotion**: Promote specific users ke admin
4. **Rollback Support**: Kembalikan ke state sebelum migration
5. **Error Handling**: Robust error handling dan logging

## Security Considerations

### 1. Default Role Assignment
- Semua user baru otomatis mendapat role USER
- Tidak ada auto-promotion ke ADMIN

### 2. Admin Protection
- Admin tidak bisa mengubah role sendiri
- Admin tidak bisa menghapus account sendiri
- Prevent accidental lockout

### 3. Token Security
- Role information dalam JWT token
- Token harus di-refresh jika role berubah
- Middleware selalu fetch latest role dari database

### 4. Database Security
- Role field di-index untuk performance
- Validation di schema level
- Enum constraint untuk valid roles

## Usage Examples

### 1. Protecting Routes
```typescript
// Admin only route
router.get('/admin-only', verifyTokenMiddleware, requireAdmin, controller);

// Multiple roles allowed
router.get('/staff-area', verifyTokenMiddleware, requireRole([UserRole.ADMIN, UserRole.STAFF]), controller);

// Resource ownership check
router.get('/my-resource/:id', verifyTokenMiddleware, requireOwnership('resource'), controller);
```

### 2. Checking Roles in Controllers
```typescript
// In controller
const user = await User.findOne({ uid: req.user.uid });

if (user.isAdmin()) {
  // Admin logic
}

if (user.hasRole(UserRole.USER)) {
  // User logic
}
```

### 3. Role-based Queries
```typescript
// Get all admins
const admins = await User.findAdmins();

// Count users by role
const userCount = await User.countByRole(UserRole.USER);
const adminCount = await User.countByRole(UserRole.ADMIN);
```

## API Response Examples

### Login Response
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "uid": "user123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER"
    },
    "token": "jwt_token_here"
  }
}
```

### Admin User List
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "uid": "user123",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "USER",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalUsers": 50,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Best Practices

### 1. Role Checking
- Selalu gunakan middleware untuk route protection
- Double-check role di controller jika diperlukan
- Gunakan instance methods untuk readability

### 2. Admin Management
- Log semua admin actions
- Implement audit trail untuk role changes
- Require confirmation untuk destructive actions

### 3. Migration
- Selalu test dengan dry-run terlebih dahulu
- Backup database sebelum migration
- Monitor logs selama migration process

### 4. Error Handling
- Provide clear error messages
- Log security-related errors
- Handle edge cases (user not found, etc.)

## Troubleshooting

### Common Issues

1. **User role not updated in token**
   - Solution: User perlu login ulang atau implement token refresh

2. **Migration fails for some users**
   - Check logs untuk specific errors
   - Run migration dengan smaller batches

3. **Admin accidentally locked out**
   - Use direct database access untuk restore admin role
   - Implement emergency admin account

4. **Performance issues with role queries**
   - Role field sudah di-index
   - Consider caching untuk frequent queries

### Monitoring

Monitor these metrics:
- Role distribution (USER vs ADMIN ratio)
- Failed authorization attempts
- Admin action frequency
- Migration success rate

## Future Enhancements

Possible improvements:
1. **Multiple Roles**: Support untuk multiple roles per user
2. **Permissions**: Granular permissions system
3. **Role Hierarchy**: Parent-child role relationships
4. **Temporary Roles**: Time-based role assignments
5. **Role Templates**: Predefined role configurations