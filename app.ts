import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import scheduleRoutes from './routes/scheduleRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoute';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/schedule', scheduleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);


console.log('🚧 Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI!)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ Gagal konek MongoDB:', err.message);
    });
