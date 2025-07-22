import { Request, Response } from 'express';
import Schedule from '../models/schedule';
import { parseScheduleFromExcel } from '../services/parseExcel';

export const uploadExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

    const hasil = parseScheduleFromExcel(req.file.buffer);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Hapus dulu jadwal bulan ini agar tidak duplikat
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    await Schedule.deleteMany({
      'schedule.date': { $regex: `^${monthPrefix}` },
    });

    // Simpan hasil baru
    await Schedule.insertMany(hasil);

    res.status(200).json({ success: true, inserted: hasil.length });
  } catch (err) {
    console.error('❌ Gagal parsing:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllSchedules = async (req: Request, res: Response) => {
    try {
      const schedules = await Schedule.find();
      res.status(200).json(schedules);
    } catch (err) {
      console.error('❌ Gagal ambil data:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
};

export const getSchedulesByEmployee = async (req: Request, res: Response) => {
    const { name } = req.query;
    try {
      const query = name ? { name: new RegExp(String(name), 'i') } : {};
      const schedules = await Schedule.find(query);
      res.status(200).json(schedules);
    } catch (err) {
      res.status(500).json({ error: 'Internal error' });
    }
  };
  
