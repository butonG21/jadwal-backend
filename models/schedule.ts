import mongoose, { Schema, Document } from 'mongoose';

interface IJadwal {
  date: string; // Format: YYYY-MM-DD
  shift: string;
}

export interface ISchedule extends Document {
  employee_id: string;
  name: string;
  department: string;
  position: string;
  schedule: IJadwal[];
}

const ScheduleSchema: Schema = new Schema({
  employee_id: { type: String, required: true },
  name: { type: String, required: true },
  department: { type: String, required: true },
  position: { type: String, required: true },
  schedule: [
    {
      date: { type: String, required: true },
      shift: { type: String, required: true },
    }
  ]
});

export default mongoose.model<ISchedule>('Schedule', ScheduleSchema);
