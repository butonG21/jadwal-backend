import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  uid: string;
  name: string;
  email?: string;
  location?: string;
}

const UserSchema: Schema = new Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String },
  email: { type: String },
  location: { type: String }
});

export default mongoose.model<IUser>('User', UserSchema);
