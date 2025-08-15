import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAttendance extends Document {
  userid: string;
  name?: string;
  date: string; // Format: YYYY-MM-DD
  start_time?: string;
  start_address?: string;
  start_image?: string;
  break_out_time?: string;
  break_out_address?: string;
  break_out_image?: string;
  break_in_time?: string;
  break_in_address?: string;
  break_in_image?: string;
  end_time?: string;
  end_address?: string;
  end_image?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IAttendanceMethods {
  hasCompleteAttendance(): boolean;
  getWorkingHours(): number | null;
  getBreakDuration(): number | null;
}

interface AttendanceModel extends Model<IAttendance, {}, IAttendanceMethods> {
  findByUserAndDate(userid: string, date: string): Promise<IAttendance | null>;
  findByUserAndDateRange(userid: string, startDate: string, endDate: string): Promise<IAttendance[]>;
  getAttendanceStats(userid?: string, startDate?: string, endDate?: string): Promise<any>;
}

const AttendanceSchema = new Schema<IAttendance, AttendanceModel, IAttendanceMethods>({
  userid: { 
    type: String, 
    required: [true, 'User ID is required'],
    trim: true,
    index: true
  },
  name: { 
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  date: { 
    type: String, 
    required: [true, 'Date is required'],
    validate: {
      validator: function(date: string) {
        return /^\d{4}-\d{2}-\d{2}$/.test(date);
      },
      message: 'Date must be in YYYY-MM-DD format'
    },
    index: true
  },
  start_time: {
    type: String,
    validate: {
      validator: function(time: string) {
        if (!time) return true;
        return /^\d{2}:\d{2}:\d{2}$/.test(time);
      },
      message: 'Time must be in HH:mm:ss format'
    }
  },
  start_address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  start_image: {
    type: String,
    trim: true,
    validate: {
      validator: function(url: string) {
        if (!url) return true;
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Image must be a valid URL'
    }
  },
  break_out_time: {
    type: String,
    validate: {
      validator: function(time: string) {
        if (!time) return true;
        return /^\d{2}:\d{2}:\d{2}$/.test(time);
      },
      message: 'Time must be in HH:mm:ss format'
    }
  },
  break_out_address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  break_out_image: {
    type: String,
    trim: true,
    validate: {
      validator: function(url: string) {
        if (!url) return true;
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Image must be a valid URL'
    }
  },
  break_in_time: {
    type: String,
    validate: {
      validator: function(time: string) {
        if (!time) return true;
        return /^\d{2}:\d{2}:\d{2}$/.test(time);
      },
      message: 'Time must be in HH:mm:ss format'
    }
  },
  break_in_address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  break_in_image: {
    type: String,
    trim: true,
    validate: {
      validator: function(url: string) {
        if (!url) return true;
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Image must be a valid URL'
    }
  },
  end_time: {
    type: String,
    validate: {
      validator: function(time: string) {
        if (!time) return true;
        return /^\d{2}:\d{2}:\d{2}$/.test(time);
      },
      message: 'Time must be in HH:mm:ss format'
    }
  },
  end_address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  end_image: {
    type: String,
    trim: true,
    validate: {
      validator: function(url: string) {
        if (!url) return true;
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Image must be a valid URL'
    }
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
AttendanceSchema.methods.hasCompleteAttendance = function(): boolean {
  return !!(this.start_time && this.end_time);
};

AttendanceSchema.methods.getWorkingHours = function(): number | null {
  if (!this.start_time || !this.end_time) return null;
  
  try {
    const start = new Date(`${this.date}T${this.start_time}`);
    const end = new Date(`${this.date}T${this.end_time}`);
    
    const diffMs = end.getTime() - start.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Hours with 2 decimal places
  } catch (error) {
    return null;
  }
};

AttendanceSchema.methods.getBreakDuration = function(): number | null {
  if (!this.break_out_time || !this.break_in_time) return null;
  
  try {
    const breakOut = new Date(`${this.date}T${this.break_out_time}`);
    const breakIn = new Date(`${this.date}T${this.break_in_time}`);
    
    const diffMs = breakIn.getTime() - breakOut.getTime();
    return Math.round((diffMs / (1000 * 60)) * 100) / 100; // Minutes with 2 decimal places
  } catch (error) {
    return null;
  }
};

// Static Methods
AttendanceSchema.statics.findByUserAndDate = function(userid: string, date: string) {
  return this.findOne({ userid, date });
};

AttendanceSchema.statics.findByUserAndDateRange = function(userid: string, startDate: string, endDate: string) {
  return this.find({
    userid,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });
};

AttendanceSchema.statics.getAttendanceStats = function(userid?: string, startDate?: string, endDate?: string) {
  const matchStage: any = {};
  
  if (userid) matchStage.userid = userid;
  if (startDate && endDate) {
    matchStage.date = { $gte: startDate, $lte: endDate };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        recordsWithStartTime: {
          $sum: { $cond: [{ $ifNull: ['$start_time', false] }, 1, 0] }
        },
        recordsWithEndTime: {
          $sum: { $cond: [{ $ifNull: ['$end_time', false] }, 1, 0] }
        },
        recordsWithBreakOut: {
          $sum: { $cond: [{ $ifNull: ['$break_out_time', false] }, 1, 0] }
        },
        recordsWithBreakIn: {
          $sum: { $cond: [{ $ifNull: ['$break_in_time', false] }, 1, 0] }
        },
        recordsWithStartImage: {
          $sum: { $cond: [{ $ifNull: ['$start_image', false] }, 1, 0] }
        },
        recordsWithEndImage: {
          $sum: { $cond: [{ $ifNull: ['$end_image', false] }, 1, 0] }
        }
      }
    }
  ]);
};

// Indexes
AttendanceSchema.index({ userid: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1 });
AttendanceSchema.index({ userid: 1 });
AttendanceSchema.index({ createdAt: -1 });

export default mongoose.model<IAttendance, AttendanceModel>('Attendance', AttendanceSchema);
