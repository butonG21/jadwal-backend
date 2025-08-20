import mongoose, { Schema, Document, Model } from 'mongoose';

interface IScheduleItem {
  date: string; // Format: YYYY-MM-DD
  shift: string;
}

export interface ISchedule extends Document {
  employee_id?: string;
  name: string;
  department: string;
  position: string;
  schedule: IScheduleItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface IScheduleMethods {
  getScheduleForMonth(month: number, year: number): IScheduleItem[];
  getScheduleForDateRange(startDate: string, endDate: string): IScheduleItem[];
  getAvailableMonths(): Array<{month: number, year: number, count: number}>;
}

interface ScheduleModel extends Model<ISchedule, {}, IScheduleMethods> {
  findByEmployeeId(employeeId: string): Promise<ISchedule | null>;
  findActiveSchedules(): Promise<ISchedule[]>;
  searchByName(name: string): Promise<ISchedule[]>;
}

const ScheduleItemSchema = new Schema<IScheduleItem>({
  date: {
    type: String,
    required: [true, 'Date is required'],
    validate: {
      validator: function(date: string) {
        return /^\d{4}-\d{2}-\d{2}$/.test(date);
      },
      message: 'Date must be in YYYY-MM-DD format'
    }
  },
  shift: {
    type: String,
    required: [true, 'Shift is required'],
    trim: true,
    maxlength: [50, 'Shift name cannot exceed 50 characters']
  }
}, { _id: false });

const ScheduleSchema = new Schema<ISchedule, ScheduleModel, IScheduleMethods>({
  employee_id: {
    type: String,
    trim: true,
    sparse: true, // Allow multiple documents with null employee_id
    index: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
    index: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters']
  },
  schedule: {
    type: [ScheduleItemSchema],
    default: [],
    validate: {
      validator: function(schedule: IScheduleItem[]) {
        // Check for duplicate dates
        const dates = schedule.map(item => item.date);
        return dates.length === new Set(dates).size;
      },
      message: 'Schedule cannot contain duplicate dates'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      // Sort schedule by date when converting to JSON
      if (ret.schedule) {
        ret.schedule.sort((a: IScheduleItem, b: IScheduleItem) => 
          a.date.localeCompare(b.date)
        );
      }
      return ret;
    }
  }
});

// Instance Methods
ScheduleSchema.methods.getScheduleForMonth = function(month: number, year: number): IScheduleItem[] {
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
  
  return this.schedule.filter((item: IScheduleItem) => 
    item.date >= startDate && item.date <= endDate
  ).sort((a: IScheduleItem, b: IScheduleItem) => a.date.localeCompare(b.date));
};

ScheduleSchema.methods.getScheduleForDateRange = function(startDate: string, endDate: string): IScheduleItem[] {
  return this.schedule.filter((item: IScheduleItem) => 
    item.date >= startDate && item.date <= endDate
  ).sort((a: IScheduleItem, b: IScheduleItem) => a.date.localeCompare(b.date));
};

ScheduleSchema.methods.getAvailableMonths = function() {
  const monthsMap = new Map();
  
  this.schedule.forEach((item: IScheduleItem) => {
    const [year, month] = item.date.split('-');
    const key = `${year}-${month}`;
    
    if (monthsMap.has(key)) {
      monthsMap.get(key).count++;
    } else {
      monthsMap.set(key, {
        year: parseInt(year),
        month: parseInt(month),
        count: 1
      });
    }
  });
  
  return Array.from(monthsMap.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
};

// Static Methods
ScheduleSchema.statics.findByEmployeeId = function(employeeId: string) {
  return this.findOne({ employee_id: employeeId, isActive: true });
};

ScheduleSchema.statics.findActiveSchedules = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

ScheduleSchema.statics.searchByName = function(name: string) {
  return this.find({
    name: new RegExp(name, 'i'),
    isActive: true
  }).sort({ name: 1 });
};

// Indexes
ScheduleSchema.index({ employee_id: 1 }, { sparse: true });
ScheduleSchema.index({ name: 1 });
ScheduleSchema.index({ department: 1 });
ScheduleSchema.index({ isActive: 1, name: 1 });
ScheduleSchema.index({ 'schedule.date': 1 });

export default mongoose.model<ISchedule, ScheduleModel>('Schedule', ScheduleSchema);// models/Schedule.ts