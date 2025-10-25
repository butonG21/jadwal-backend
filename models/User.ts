// models/User.ts (Updated with profile image fields)
import mongoose, { Document, Schema } from 'mongoose';

// Role enum for type safety
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

interface IUser extends Document {
  uid: string;
  name: string;
  email?: string;
  location?: string;
  role: UserRole;
  
  // Profile Image Fields
  profileImage?: string;
  profileImageThumbnail?: string;
  profileImageFileId?: string;
  profileImageAlt?: string;
  profileImageCaption?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  
  // Role-related methods
  isAdmin(): boolean;
  hasRole(role: UserRole): boolean;
}

const userSchema = new Schema<IUser>({
  uid: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  location: {
    type: String,
    trim: true,
    maxlength: 100
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
    required: true,
    index: true
  },
  
  // Profile Image Fields
  profileImage: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Profile image must be a valid URL'
    }
  },
  profileImageThumbnail: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Profile image thumbnail must be a valid URL'
    }
  },
  profileImageFileId: {
    type: String,
    trim: true,
    index: true
  },
  profileImageAlt: {
    type: String,
    trim: true,
    maxlength: 200
  },
  profileImageCaption: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for better performance
userSchema.index({ uid: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ profileImageFileId: 1 });
userSchema.index({ role: 1 });

// Pre-save middleware to update updatedAt
userSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Pre-findOneAndUpdate middleware to update updatedAt
userSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Virtual for profile image variants
userSchema.virtual('profileImageVariants').get(function() {
  if (!this.profileImage) return null;
  
  // This would ideally use the ProfileImageService, but virtuals can't be async
  // So we'll provide basic variants here
  return {
    original: this.profileImage,
    thumbnail: this.profileImageThumbnail || this.profileImage,
    // Additional variants would be generated on-demand via the service
  };
});

// Role-related instance methods
userSchema.methods.isAdmin = function(): boolean {
  return this.role === UserRole.ADMIN;
};

userSchema.methods.hasRole = function(role: UserRole): boolean {
  return this.role === role;
};

// Method to get full profile data including image variants
userSchema.methods.getFullProfile = function() {
  return {
    uid: this.uid,
    name: this.name,
    email: this.email,
    location: this.location,
    role: this.role,
    profileImage: {
      original: this.profileImage,
      thumbnail: this.profileImageThumbnail,
      alt: this.profileImageAlt,
      caption: this.profileImageCaption,
      fileId: this.profileImageFileId
    },
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLoginAt: this.lastLoginAt
  };
};

// Static method to find user with profile image
userSchema.statics.findWithProfileImage = function(query: any) {
  return this.find({
    ...query,
    profileImage: { $exists: true, $ne: null }
  });
};

// Static method to cleanup orphaned profile images
userSchema.statics.getOrphanedProfileImages = function() {
  return this.find({
    profileImageFileId: { $exists: true, $ne: null },
    profileImage: null
  });
};

// Role-related static methods
userSchema.statics.findAdmins = function() {
  return this.find({ role: UserRole.ADMIN });
};

userSchema.statics.findByRole = function(role: UserRole) {
  return this.find({ role });
};

userSchema.statics.countByRole = function(role: UserRole) {
  return this.countDocuments({ role });
};

// Transform output for JSON
userSchema.set('toJSON', {
  transform: function(doc, ret) {
    // Don't expose internal profileImageFileId in API responses unless specifically requested
    delete ret._id;
    delete ret.__v;
    
    // Group profile image fields
    if (ret.profileImage || ret.profileImageThumbnail) {
      ret.profileImageData = {
        original: ret.profileImage,
        thumbnail: ret.profileImageThumbnail,
        alt: ret.profileImageAlt,
        caption: ret.profileImageCaption
      };
      
      // Remove individual fields from root level
      delete ret.profileImage;
      delete ret.profileImageThumbnail;
      delete ret.profileImageAlt;
      delete ret.profileImageCaption;
      delete ret.profileImageFileId;
    }
    
    return ret;
  }
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
export { IUser };