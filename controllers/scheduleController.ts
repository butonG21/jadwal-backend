import { Request, Response } from 'express';
import Schedule from '../models/schedule';
import { parseScheduleFromExcel } from '../services/parseExcel';
import moment from 'moment';

export const uploadExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'File tidak ditemukan' 
      });
    }

    const parsedData = parseScheduleFromExcel(req.file.buffer);

    if (parsedData.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Tidak ada data valid yang bisa diparsing dari file.' 
      });
    }

    // Process each employee individually to avoid TypeScript issues
    let matchedCount = 0;
    let upsertedCount = 0;

    for (const employeeData of parsedData) {
      try {
        // First, remove existing schedules for the months we're updating
        const datesToUpdate = employeeData.schedule.map((s: any) => s.date);
        const uniqueMonths = [...new Set(datesToUpdate.map((d: string) => d.substring(0, 7)))]; // Ambil YYYY-MM

        // Remove old schedules for these months
        for (const month of uniqueMonths) {
          await Schedule.updateOne(
            { employee_id: employeeData.employee_id },
            { $pull: { schedule: { date: { $regex: `^${month}` } } } }
          );
        }

        // Update or create employee with new schedule data
        const result = await Schedule.updateOne(
          { employee_id: employeeData.employee_id },
          {
            $set: {
              name: employeeData.name,
              position: employeeData.position,
              department: employeeData.department,
            },
            $push: {
              schedule: { 
                $each: employeeData.schedule.map((s: any) => ({ 
                  date: s.date, 
                  shift: s.shift 
                }))
              }
            }
          },
          { upsert: true }
        );

        if (result.matchedCount > 0) matchedCount++;
        if (result.upsertedCount > 0) upsertedCount++;

      } catch (employeeError) {
        console.error(`❌ Error processing employee ${employeeData.employee_id}:`, employeeError);
        // Continue with other employees
      }
    }

    res.status(200).json({
      success: true,
      message: 'Jadwal berhasil diperbarui.',
      data: {
        processed_employees: parsedData.length,
        matched_count: matchedCount,
        upserted_count: upsertedCount
      }
    });

  } catch (err) {
    console.error('❌ Gagal upload/parsing:', err);
    res.status(500).json({ 
      success: false,
      error: 'Terjadi kesalahan pada server.',
      details: process.env.NODE_ENV === 'development' ? (err as Error).message : undefined
    });
  }
};

export const getAllSchedules = async (req: Request, res: Response) => {
    try {
      const schedules = await Schedule.find().sort({ name: 1 });
      
      res.status(200).json({
        success: true,
        message: 'All schedules retrieved successfully',
        data: schedules,
        total: schedules.length
      });
    } catch (err) {
      console.error('❌ Gagal ambil data:', err);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
};

export const getSchedulesByEmployee = async (req: Request, res: Response) => {
    const { name } = req.query;
    try {
      const query = name ? { name: new RegExp(String(name), 'i') } : {};
      const schedules = await Schedule.find(query).sort({ name: 1 });
      
      res.status(200).json({
        success: true,
        message: name ? `Schedules found for search: ${name}` : 'All schedules retrieved',
        data: schedules,
        total: schedules.length,
        search_term: name || null
      });
    } catch (err) {
      console.error('❌ Error searching schedules:', err);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
};

/**
 * Get employee schedule filtered by month
 * GET /api/schedule/:employeeId/filter?month=7&year=2025
 */
export const getScheduleByMonth = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: 'Month and year parameters are required'
      });
    }

    const monthNum = parseInt(month as string);
    const yearNum = parseInt(year as string);

    // Create date range for the month
    const startDate = moment(`${year}-${month.toString().padStart(2, '0')}-01`).format('YYYY-MM-DD');
    const endDate = moment(`${year}-${month.toString().padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');

    // Find employee and filter schedule
    const employee = await Schedule.findOne({ employee_id: employeeId });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: `Employee with ID ${employeeId} not found`
      });
    }

    // Filter schedule by date range
    const filteredSchedule = employee.schedule.filter((item: any) => {
      return item.date >= startDate && item.date <= endDate;
    }).sort((a: any, b: any) => a.date.localeCompare(b.date));

    if (filteredSchedule.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No schedule found for employee ${employeeId} in ${month}/${year}`,
        data: {
          employee_id: employeeId,
          name: employee.name,
          month: monthNum,
          year: yearNum,
          schedule: []
        }
      });
    }

    // Calculate statistics
    const totalDays = filteredSchedule.length;
    const shiftCounts = filteredSchedule.reduce((acc: any, item: any) => {
      acc[item.shift] = (acc[item.shift] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: `Schedule retrieved successfully for ${month}/${year}`,
      data: {
        employee_id: employee.employee_id,
        name: employee.name,
        position: employee.position,
        department: employee.department,
        filter: {
          month: monthNum,
          year: yearNum,
          month_name: moment(`${year}-${month}`).format('MMMM'),
          total_days: totalDays
        },
        statistics: {
          total_scheduled_days: totalDays,
          shift_distribution: shiftCounts,
          working_days_in_month: moment(`${year}-${month}-01`).daysInMonth()
        },
        schedule: filteredSchedule
      }
    });

  } catch (error) {
    console.error('❌ Error filtering schedule by month:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get employee schedule for current month
 * GET /api/schedule/:employeeId/current-month
 */
export const getCurrentMonthSchedule = async (req: Request, res: Response) => {
  try {
    const currentDate = moment();
    
    // Set query parameters for current month
    req.query.month = (currentDate.month() + 1).toString(); // moment months are 0-indexed
    req.query.year = currentDate.year().toString();
    
    // Reuse the existing function
    return getScheduleByMonth(req, res);
    
  } catch (error) {
    console.error('❌ Error getting current month schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get available months for employee schedule
 * GET /api/schedule/:employeeId/available-months
 */
export const getAvailableMonths = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    const employee = await Schedule.findOne({ employee_id: employeeId });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: `Employee with ID ${employeeId} not found`
      });
    }

    // Process schedule to get available months
    const monthsMap = new Map();
    
    employee.schedule.forEach((item: any) => {
      const date = moment(item.date);
      if (date.isValid()) {
        const key = `${date.year()}-${date.month() + 1}`;
        if (monthsMap.has(key)) {
          monthsMap.get(key).count++;
          if (item.date < monthsMap.get(key).first_date) {
            monthsMap.get(key).first_date = item.date;
          }
          if (item.date > monthsMap.get(key).last_date) {
            monthsMap.get(key).last_date = item.date;
          }
        } else {
          monthsMap.set(key, {
            year: date.year(),
            month: date.month() + 1,
            month_name: date.format('MMMM'),
            count: 1,
            first_date: item.date,
            last_date: item.date
          });
        }
      }
    });

    // Convert map to array and sort
    const availableMonths = Array.from(monthsMap.values())
      .map(item => ({
        year: item.year,
        month: item.month,
        month_name: item.month_name,
        total_days: item.count,
        period: {
          start: item.first_date,
          end: item.last_date
        }
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

    res.status(200).json({
      success: true,
      message: 'Available months retrieved successfully',
      data: {
        employee_id: employeeId,
        name: employee.name,
        available_months: availableMonths,
        total_months: availableMonths.length
      }
    });

  } catch (error) {
    console.error('❌ Error getting available months:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get employee schedule with date range filter
 * GET /api/schedule/:employeeId/date-range?start_date=2025-07-01&end_date=2025-07-31
 */
export const getScheduleByDateRange = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date parameters are required'
      });
    }

    // Find employee
    const employee = await Schedule.findOne({ employee_id: employeeId });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: `Employee with ID ${employeeId} not found`
      });
    }

    // Filter schedule by date range
    const filteredSchedule = employee.schedule.filter((item: any) => {
      return item.date >= start_date && item.date <= end_date;
    }).sort((a: any, b: any) => a.date.localeCompare(b.date));

    if (filteredSchedule.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No schedule found for employee ${employeeId} between ${start_date} and ${end_date}`,
        data: {
          employee_id: employeeId,
          name: employee.name,
          date_range: { start_date, end_date },
          schedule: []
        }
      });
    }

    // Calculate statistics
    const totalDays = filteredSchedule.length;
    const shiftCounts = filteredSchedule.reduce((acc: any, item: any) => {
      acc[item.shift] = (acc[item.shift] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: `Schedule retrieved successfully for date range ${start_date} to ${end_date}`,
      data: {
        employee_id: employee.employee_id,
        name: employee.name,
        position: employee.position,
        department: employee.department,
        filter: {
          start_date,
          end_date,
          total_days: totalDays
        },
        statistics: {
          total_scheduled_days: totalDays,
          shift_distribution: shiftCounts
        },
        schedule: filteredSchedule
      }
    });

  } catch (error) {
    console.error('❌ Error filtering schedule by date range:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get single employee basic info (without filters)
 * GET /api/schedule/:employeeId
 */
export const getEmployeeSchedule = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    const employee = await Schedule.findOne({ employee_id: employeeId });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: `Employee with ID ${employeeId} not found`
      });
    }

    // Sort schedule by date
    const sortedSchedule = employee.schedule.sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    );

    // Calculate basic statistics
    const totalDays = sortedSchedule.length;
    const shiftCounts = sortedSchedule.reduce((acc: any, item: any) => {
      acc[item.shift] = (acc[item.shift] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: 'Employee schedule retrieved successfully',
      data: {
        employee_id: employee.employee_id,
        name: employee.name,
        position: employee.position,
        department: employee.department,
        statistics: {
          total_scheduled_days: totalDays,
          shift_distribution: shiftCounts,
          date_range: {
            start: sortedSchedule[0]?.date || null,
            end: sortedSchedule[sortedSchedule.length - 1]?.date || null
          }
        },
        schedule: sortedSchedule
      }
    });

  } catch (error) {
    console.error('❌ Error getting employee schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};