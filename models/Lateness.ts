import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ILateness extends Document {
  userid: string;
  name?: string;
  date: string; // Format: YYYY-MM-DD
  shift: string; // Pagi, Middle, Siang
  
  // Jadwal yang seharusnya
  scheduled_start_time: string;
  scheduled_end_time: string;
  
  // Waktu aktual kehadiran
  actual_start_time?: string;
  actual_end_time?: string;
  actual_break_out_time?: string;
  actual_break_in_time?: string;
  
  // Perhitungan keterlambatan
  start_lateness_minutes: number; // keterlambatan masuk
  end_lateness_minutes: number; // keterlambatan pulang (negatif jika pulang lebih awal)
  break_lateness_minutes: number; // keterlambatan dari istirahat
  
  // Status kehadiran
  attendance_status: 'on_time' | 'late' | 'very_late' | 'absent' | 'off_day' | 'early_departure';
  break_status: 'normal' | 'long_break' | 'no_break';
  
  // Informasi tambahan
  total_working_minutes: number; // total jam kerja aktual
  is_complete_attendance: boolean; // apakah data kehadiran lengkap
  
  // Format tampilan yang mudah dibaca (optional)
  start_lateness_display?: string;
  end_lateness_display?: string;
  break_lateness_display?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ILatenessMethods {
  isLate(): boolean;
  getTotalLatenessMinutes(): number;
  getWorkingHoursFormatted(): string;
}

interface LatenessModel extends Model<ILateness, {}, ILatenessMethods> {
  findByUserAndDate(userid: string, date: string): Promise<ILateness | null>;
  findByUserAndDateRange(userid: string, startDate: string, endDate: string): Promise<ILateness[]>;
  getLatenessStats(userid?: string, startDate?: string, endDate?: string): Promise<any>;
  findLateEmployees(date: string): Promise<ILateness[]>;
}

const LatenessSchema = new Schema<ILateness, LatenessModel, ILatenessMethods>({
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
  shift: {
    type: String,
    required: [true, 'Shift is required'],
    enum: ['Pagi', 'Middle', 'Siang'],
    index: true
  },
  scheduled_start_time: {
    type: String,
    required: [true, 'Scheduled start time is required'],
    validate: {
      validator: function(time: string) {
        return /^\d{2}:\d{2}:\d{2}$/.test(time);
      },
      message: 'Time must be in HH:mm:ss format'
    }
  },
  scheduled_end_time: {
    type: String,
    required: [true, 'Scheduled end time is required'],
    validate: {
      validator: function(time: string) {
        return /^\d{2}:\d{2}:\d{2}$/.test(time);
      },
      message: 'Time must be in HH:mm:ss format'
    }
  },
  actual_start_time: {
    type: String,
    validate: {
      validator: function(time: string) {
        if (!time) return true;
        return /^\d{2}:\d{2}:\d{2}$/.test(time);
      },
      message: 'Time must be in HH:mm:ss format'
    }
  },
  actual_end_time: {
    type: String,
    validate: {
      validator: function(time: string) {
        if (!time) return true;
        return /^\d{2}:\d{2}:\d{2}$/.test(time);
      },
      message: 'Time must be in HH:mm:ss format'
    }
  },
  actual_break_out_time: {
    type: String,
    validate: {
      validator: function(time: string) {
        if (!time) return true;
        return /^\d{2}:\d{2}:\d{2}$/.test(time);
      },
      message: 'Time must be in HH:mm:ss format'
    }
  },
  actual_break_in_time: {
    type: String,
    validate: {
      validator: function(time: string) {
        if (!time) return true;
        return /^\d{2}:\d{2}:\d{2}$/.test(time);
      },
      message: 'Time must be in HH:mm:ss format'
    }
  },
  start_lateness_minutes: {
    type: Number,
    default: 0,
    index: true
  },
  end_lateness_minutes: {
    type: Number,
    default: 0
  },
  break_lateness_minutes: {
    type: Number,
    default: 0
  },
  attendance_status: {
    type: String,
    enum: ['on_time', 'late', 'very_late', 'absent', 'off_day', 'early_departure'],
    default: 'absent',
    index: true
  },
  break_status: {
    type: String,
    enum: ['normal', 'long_break', 'no_break'],
    default: 'no_break'
  },
  total_working_minutes: {
    type: Number,
    default: 0
  },
  is_complete_attendance: {
    type: Boolean,
    default: false
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
LatenessSchema.methods.isLate = function(): boolean {
  return this.start_lateness_minutes > 0 || this.end_lateness_minutes < 0 || this.break_lateness_minutes > 0;
};

LatenessSchema.methods.getTotalLatenessMinutes = function(): number {
  return Math.max(0, this.start_lateness_minutes) + 
         Math.max(0, -this.end_lateness_minutes) + 
         Math.max(0, this.break_lateness_minutes);
};

LatenessSchema.methods.getWorkingHoursFormatted = function(): string {
  const hours = Math.floor(this.total_working_minutes / 60);
  const minutes = this.total_working_minutes % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

// Static Methods
LatenessSchema.statics.findByUserAndDate = function(userid: string, date: string) {
  return this.findOne({ userid, date });
};

LatenessSchema.statics.findByUserAndDateRange = function(userid: string, startDate: string, endDate: string) {
  return this.find({
    userid,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });
};

LatenessSchema.statics.findLateEmployees = function(date: string) {
  return this.find({
    date,
    $or: [
      { start_lateness_minutes: { $gt: 0 } },
      { end_lateness_minutes: { $lt: 0 } },
      { break_lateness_minutes: { $gt: 0 } }
    ]
  }).sort({ start_lateness_minutes: -1 });
};

LatenessSchema.statics.getLatenessStats = function(userid?: string, startDate?: string, endDate?: string) {
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
        onTimeCount: {
          $sum: { $cond: [{ $eq: ['$attendance_status', 'on_time'] }, 1, 0] }
        },
        lateCount: {
          $sum: { $cond: [{ $eq: ['$attendance_status', 'late'] }, 1, 0] }
        },
        veryLateCount: {
          $sum: { $cond: [{ $eq: ['$attendance_status', 'very_late'] }, 1, 0] }
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ['$attendance_status', 'absent'] }, 1, 0] }
        },
        averageStartLateness: { $avg: '$start_lateness_minutes' },
        averageBreakLateness: { $avg: '$break_lateness_minutes' },
        averageWorkingHours: { $avg: { $divide: ['$total_working_minutes', 60] } },
        longBreakCount: {
          $sum: { $cond: [{ $eq: ['$break_status', 'long_break'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Indexes
LatenessSchema.index({ userid: 1, date: 1 }, { unique: true });
LatenessSchema.index({ date: 1 });
LatenessSchema.index({ userid: 1 });
LatenessSchema.index({ attendance_status: 1 });
LatenessSchema.index({ shift: 1, date: 1 });
LatenessSchema.index({ start_lateness_minutes: -1 });
LatenessSchema.index({ createdAt: -1 });

export default mongoose.model<ILateness, LatenessModel>('Lateness', LatenessSchema);