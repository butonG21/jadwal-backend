import { Request, Response } from 'express';
import Schedule from '../models/schedule';
import { parseScheduleFromExcel } from '../services/parseExcel';

export const uploadExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File tidak ditemukan' });
    }

    const parsedData = parseScheduleFromExcel(req.file.buffer);

    if (parsedData.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data valid yang bisa diparsing dari file.' });
    }

    // Buat daftar operasi bulk write untuk MongoDB
    const bulkOps = parsedData.map(employeeData => {
      // Untuk setiap karyawan, kita akan melakukan 'updateOne' dengan 'upsert'
      return {
        updateOne: {
          // Cari dokumen berdasarkan ID karyawan
          filter: { employee_id: employeeData.employee_id },
          // Data yang akan di-update atau di-insert
          update: {
            $set: {
              name: employeeData.name,
              position: employeeData.position,
              department: employeeData.department,
            },
            // Ganti seluruh array schedule dengan data yang baru
            $push: {
              schedule: { $each: employeeData.schedule }
            }
          },
          // Jika karyawan belum ada, buat dokumen baru
          upsert: true, 
        }
      };
    });

    // Hapus dulu jadwal lama dari semua karyawan yang ada di file Excel
    const employeeIds = parsedData.map(e => e.employee_id);
    const datesToUpdate = parsedData.flatMap(e => e.schedule.map(s => s.date));
    const uniqueMonths = [...new Set(datesToUpdate.map(d => d.substring(0, 7)))]; // Ambil YYYY-MM

    for (const month of uniqueMonths) {
        await Schedule.updateMany(
            { employee_id: { $in: employeeIds } },
            { $pull: { schedule: { date: { $regex: `^${month}` } } } }
        );
    }
    
    // Jalankan semua operasi secara bersamaan
    const result = await Schedule.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: 'Jadwal berhasil diperbarui.',
      matchedCount: result.matchedCount,
      upsertedCount: result.upsertedCount,
    });

  } catch (err) {
    console.error('❌ Gagal upload/parsing:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
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
  
