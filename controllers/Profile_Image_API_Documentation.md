# Profile Image API Documentation

## Overview

Profile Image API memungkinkan user untuk upload, mengelola, dan mengambil foto profil mereka. Semua gambar diproses menggunakan ImageKit untuk optimisasi dan penyimpanan yang efisien.

## Base URL

```
/api/v1/users/profile/image
```

## Authentication

Semua endpoint (kecuali `GET /user/:userId`) memerlukan JWT token dalam Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Upload Profile Image

**Endpoint:** `POST /api/v1/users/profile/image/upload`

**Description:** Upload foto profil baru untuk user yang sedang login.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `profileImage` (file) - Image file (JPEG, PNG, WebP, max 10MB)

**Rate Limit:** 5 uploads per 15 minutes per user

**Example Request:**
```bash
curl -X POST \
  http://localhost:5000/api/v1/users/profile/image/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "profileImage=@/path/to/image.jpg"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "data": {
    "message": "Profile image uploaded successfully",
    "user": {
      "uid": "user123",
      "name": "John Doe",
      "email": "john@example.com",
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
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error Responses:**
```json
// No file uploaded
{
  "success": false,
  "error": "Profile image file is required",
  "statusCode": 400
}

// Invalid file type
{
  "success": false,
  "error": "Only JPEG, PNG, and WebP images are allowed",
  "statusCode": 400
}

// File too large
{
  "success": false,
  "error": "Profile image size exceeds limit (10MB)",
  "statusCode": 400
}
```

### 2. Get Profile Image

**Endpoint:** `GET /api/v1/users/profile/image`

**Description:** Mengambil foto profil user yang sedang login.

**Query Parameters:**
- `size` (optional) - Image size variant: `thumbnail`, `small`, `medium`, `original`

**Rate Limit:** 20 requests per 5 minutes

**Example Request:**
```bash
curl -X GET \
  "http://localhost:5000/api/v1/users/profile/image?size=thumbnail" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile image retrieved successfully",
  "data": {
    "user": {
      "uid": "user123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "profileImage": {
      "url": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-150,h-150,c-maintain_ratio,q-80",
      "thumbnail": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-150,h-150,c-maintain_ratio,q-80,f-webp",
      "variants": {
        "original": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg",
        "thumbnail": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-150,h-150,c-maintain_ratio,q-80",
        "small": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-300,h-300,c-maintain_ratio,q-80",
        "medium": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-600,h-600,c-maintain_ratio,q-80"
      }
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Profile image not found",
  "statusCode": 404
}
```

### 3. Delete Profile Image

**Endpoint:** `DELETE /api/v1/users/profile/image`

**Description:** Menghapus foto profil user yang sedang login.

**Rate Limit:** 5 deletes per 15 minutes per user

**Example Request:**
```bash
curl -X DELETE \
  http://localhost:5000/api/v1/users/profile/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile image deleted successfully",
  "data": {
    "user": {
      "uid": "user123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "deletedFromImageKit": true
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "No profile image found to delete",
  "statusCode": 404
}
```

### 4. Update Profile Image Metadata

**Endpoint:** `PUT /api/v1/users/profile/image/meta`

**Description:** Update alt text dan caption untuk foto profil.

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "alt": "Profile picture of John Doe",
  "caption": "My latest profile photo"
}
```

**Example Request:**
```bash
curl -X PUT \
  http://localhost:5000/api/v1/users/profile/image/meta \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alt":"Profile picture of John Doe","caption":"My latest profile photo"}'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile image metadata updated successfully",
  "data": {
    "user": {
      "uid": "user123",
      "name": "John Doe",
      "profileImage": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg",
      "profileImageAlt": "Profile picture of John Doe",
      "profileImageCaption": "My latest profile photo"
    }
  }
}
```

### 5. Get Profile Image by User ID

**Endpoint:** `GET /api/v1/users/profile/image/user/:userId`

**Description:** Mengambil foto profil user berdasarkan User ID (public access).

**Parameters:**
- `userId` (path) - User ID

**Query Parameters:**
- `size` (optional) - Image size variant: `thumbnail`, `small`, `medium`, `original`

**Rate Limit:** 20 requests per 5 minutes

**Authentication:** Not required (public endpoint)

**Example Request:**
```bash
curl -X GET \
  "http://localhost:5000/api/v1/users/profile/image/user/user123?size=thumbnail"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile image retrieved successfully",
  "data": {
    "user": {
      "uid": "user123",
      "name": "John Doe"
    },
    "profileImage": {
      "url": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-150,h-150,c-maintain_ratio,q-80",
      "thumbnail": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-150,h-150,c-maintain_ratio,q-80,f-webp"
    }
  }
}
```

## Updated User Profile Response

**Endpoint:** `GET /api/v1/users/me` (Updated)

Profile response sekarang sudah include foto profil:

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "uid": "user123",
    "name": "John Doe",
    "position": "Staff",
    "department": "IT",
    "email": "john@example.com",
    "location": "Jakarta",
    "profileImage": {
      "original": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg",
      "thumbnail": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-150,h-150,c-maintain_ratio,q-80,f-webp",
      "small": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-300,h-300,c-maintain_ratio,q-80",
      "medium": "https://ik.imagekit.io/your_imagekit_id/profiles/profile_user123_1704067200000.jpg?tr=w-600,h-600,c-maintain_ratio,q-80"
    },
    "schedule": [...],
    "metadata": {
      "totalScheduledDays": 22,
      "lastLoginAt": "2025-01-15T09:30:00.000Z",
      "accountCreatedAt": "2025-01-01T10:00:00.000Z",
      "profileUpdatedAt": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

## Image Processing Features

### Automatic Optimization
- **Quality**: Images automatically optimized to 80% quality
- **Resize**: Large images resized to max 800x800px while maintaining aspect ratio
- **Format**: WebP format generated for thumbnails for better compression

### Image Variants
- **Original**: Full resolution uploaded image
- **Thumbnail**: 150x150px for avatars and small displays  
- **Small**: 300x300px for profile cards
- **Medium**: 600x600px for detailed profile views

### File Limitations
- **Max Size**: 10MB per file
- **Allowed Formats**: JPEG, PNG, WebP
- **Storage**: Organized in `/profiles/` folder in ImageKit

## Error Handling

### Common Error Codes

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | VALIDATION_ERROR | Invalid file type or missing required fields |
| 401 | UNAUTHENTICATED | No valid JWT token provided |
| 404 | NOT_FOUND | Profile image or user not found |
| 413 | PAYLOAD_TOO_LARGE | File size exceeds 10MB limit |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error during image processing |

### Rate Limiting

- **Upload/Delete**: 5 requests per 15 minutes per user
- **Get Image**: 20 requests per 5 minutes per IP
- **Rate limit headers** included in all responses

## Integration Examples

### Frontend JavaScript Example

```javascript
// Upload profile image
async function uploadProfileImage(file) {
  const formData = new FormData();
  formData.append('profileImage', file);

  try {
    const response = await fetch('/api/v1/users/profile/image/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Upload successful:', result.data);
      // Update UI with new profile image
      document.getElementById('profileImg').src = result.data.imageVariants.thumbnail;
    } else {
      console.error('Upload failed:', result.error);
    }
  } catch (error) {
    console.error('Upload error:', error);
  }
}

// Get profile with image
async function getProfile() {
  try {
    const response = await fetch('/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const result = await response.json();
    
    if (result.success && result.data.profileImage) {
      // Display profile image
      document.getElementById('profileImg').src = result.data.profileImage.thumbnail;
    }
  } catch (error) {
    console.error('Error getting profile:', error);
  }
}
```

### React Example

```jsx
import { useState } from 'react';

function ProfileImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    
    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      const response = await fetch('/api/v1/users/profile/image/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setProfileImage(result.data.imageVariants.thumbnail);
      } else {
        alert('Upload failed: ' + result.error);
      }
    } catch (error) {
      alert('Upload error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {profileImage && (
        <img 
          src={profileImage} 
          alt="Profile" 
          style={{ width: 150, height: 150, borderRadius: '50%' }}
        />
      )}
      
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileUpload}
        disabled={uploading}
      />
      
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

## Security Considerations

- **Authentication**: All private endpoints require valid JWT token
- **File Validation**: Strict file type and size validation
- **Rate Limiting**: Prevents abuse with configurable limits
- **Image Processing**: All images processed through ImageKit for security
- **Clean URLs**: Generated URLs don't expose internal file structure