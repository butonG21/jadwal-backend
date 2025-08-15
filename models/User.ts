import mongoose, { Schema, Document, Model } from 'mongoose';
import { logger } from '../utils/loggers';

export interface IUser extends Document {
  uid: string;
  name: string;
  email?: string;
  location?: string;
  isActive: boolean;
  lastLogin?: Date;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  updateLastLogin(): Promise<IUser>;
  getProfile(): Partial<IUser>;
}

interface UserModel extends Model<IUser, {}, IUserMethods> {
  findByUid(uid: string): Promise<IUser | null>;
  findActiveUsers(): Promise<IUser[]>;
}

const UserSchema = new Schema<IUser, UserModel, IUserMethods>({
  uid: { 
    type: String, 
    required: [true, 'User ID is required'],
    unique: true,
    trim: true,
    index: true
  },
  name: { 
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: { 
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email: string) {
        if (!email) return true; // Email is optional
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  location: { 
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Instance Methods
UserSchema.methods.updateLastLogin = async function(): Promise<IUser> {
  this.lastLogin = new Date();
  this.loginCount += 1;
  await this.save();
  
  logger.info('User login updated', {
    uid: this.uid,
    loginCount: this.loginCount,
    lastLogin: this.lastLogin
  });
  
  return this;
};

UserSchema.methods.getProfile = function(): Partial<IUser> {
  return {
    uid: this.uid,
    name: this.name,
    email: this.email,
    location: this.location,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static Methods
UserSchema.statics.findByUid = function(uid: string) {
  return this.findOne({ uid, isActive: true });
};

UserSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true }).select('-__v').sort({ name: 1 });
};

// Indexes
UserSchema.index({ uid: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ isActive: 1, lastLogin: -1 });

// Pre-save middleware
UserSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.name = this.name.trim();
  }
  
  if (this.isModified('email') && this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  
  next();
});

export default mongoose.model<IUser, UserModel>('User', UserSchema);