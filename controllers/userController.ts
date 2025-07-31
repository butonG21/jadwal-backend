import { Response } from 'express';
import Schedule from '../models/schedule';
import { AuthenticatedRequest } from '../middlewares/verifyToken';

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const userNameLower = user.name?.toLowerCase();

    // Ambil SEMUA dokumen Schedule milik user (Juli, Agustus, dst)
    const scheduleDocs = await Schedule.find({
      $or: [
        { employee_id: user.uid },
        { name: new RegExp(`^${userNameLower}$`, 'i') }
      ]
    });

    if (!scheduleDocs.length) {
      return res.status(200).json({
        uid: user.uid,
        name: user.name,
        position: null,
        email: user.email || null,
        location: user.location || '',
        schedule: [],
      });
    }

    // Gabungkan semua schedule dari seluruh dokumen user tersebut
    const allSchedules = scheduleDocs.flatMap((doc) => doc.schedule);

    res.status(200).json({
      uid: user.uid,
      name: user.name,
      position: scheduleDocs[0].position,
      email: user.email || null,
      location: user.location || '',
      schedule: allSchedules,
    });
  } catch (err) {
    console.error('🔥 Error saat mengambil profil:', err);
    res.status(500).json({ error: 'Gagal mengambil data profil dan jadwal.' });
  }
};
