// models/Attendance.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  userid: string;
  name?: string; // Optional, can be used for display purposes
  date: string; // Format: YYYY-MM-DD
  start_time: string;
  start_address: string;
  start_image: string | null;
  break_out_time: string;
  break_out_address: string;
  break_out_image: string | null;
  break_in_time: string;
  break_in_address: string;
  break_in_image: string | null;
  end_time: string;
  end_address: string;
  end_image: string | null;
}

const AttendanceSchema = new Schema<IAttendance>({
  userid: { type: String, required: true },
  name: { type: String },
  date: { type: String, required: true },
  start_time: String,
  start_address: String,
  start_image: String,
  break_out_time: String,
  break_out_address: String,
  break_out_image: String,
  break_in_time: String,
  break_in_address: String,
  break_in_image: String,
  end_time: String,
  end_address: String,
  end_image: String,
});

// Buat index unik: 1 data per user per tanggal
AttendanceSchema.index({ userid: 1, date: 1 }, { unique: true });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
