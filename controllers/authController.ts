import { Request, Response } from 'express';
import axios from 'axios';
import qs from 'qs';
import User from '../models/User';
import { generateToken } from '../utils/jwt';
import Schedule from '../models/schedule';
import { AuthenticatedRequest } from '../middlewares/verifyToken';

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });

  try {
    const response = await axios.post(
      'http://attendance-api.shabuhachi.id/service/check_login1.php',
      qs.stringify({
        username,
        passwd: password,
        version: '1.4.0'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { error, uid, user } = response.data;

    if (error || !uid || !user?.name) {
      return res.status(401).json({ error: 'Login gagal. Username/password salah.' });
    }

    // Simpan ke MongoDB jika belum ada
    let existingUser = await User.findOne({ uid });
    if (!existingUser) {
      existingUser = new User({
        uid,
        name: user.name,
        email: user.email || '',
        location: user.location || ''
      });
      await existingUser.save();
    }

    // Buat token sesi
    const token = generateToken({
      uid,
      name: user.name
    });

    return res.json({
      message: 'Login berhasil',
      token,
      user: {
        uid,
        name: user.name,
        email: user.email,
        location: user.location
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan saat menghubungi server Attendance.' });
  }
}

export const logout = async (req: Request, res: Response) => {
    // Secara teknis, kita tidak bisa benar-benar menghapus token JWT
    // Jadi frontend harus menghapus token dari localStorage/sessionStorage
    // atau cookie yang digunakan untuk menyimpan token tersebut.
    // Hanya mengirimkan pesan sukses
    // atau bisa menghapus sesi di server jika menggunakan sesi berbasis server.
    // juga bisa memblacklist token di database jika diperlukan.
  
    return res.status(200).json({ message: 'Logout berhasil. Silakan hapus token di sisi client.' });
  };

  
