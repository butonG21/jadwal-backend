import { Response } from 'express';
import Schedule from '../models/schedule';
import { AuthenticatedRequest } from '../middlewares/verifyToken';

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;

    console.log('🔍 Mencari data profil dan jadwal untuk user:');
    console.log('👉 UID:', user.uid);
    console.log('👉 Name:', user.name);

    // Normalisasi nama ke lowercase
    const userNameLower = user.name?.toLowerCase();

    // Cari berdasarkan employee_id atau nama (case insensitive)
    const scheduleDoc = await Schedule.findOne({
      $or: [
        { employee_id: user.uid },
        { name: new RegExp(`^${userNameLower}$`, 'i') } // regex insensitive
      ]
    });

    if (scheduleDoc) {
      console.log('✅ Jadwal ditemukan:');
      console.log('📅 Total hari tercatat:', scheduleDoc.schedule.length);
    } else {
      console.log('❌ Jadwal tidak ditemukan.');
    }

    res.status(200).json({
      uid: user.uid,
      name: user.name,
      email: user.email || null,
      location: user.location || '',
      schedule: scheduleDoc ? scheduleDoc.schedule : [],
    });
  } catch (err) {
    console.error('🔥 Error saat mengambil profil:', err);
    res.status(500).json({ error: 'Gagal mengambil data profil dan jadwal.' });
  }
};
