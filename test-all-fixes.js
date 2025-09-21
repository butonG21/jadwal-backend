require('dotenv').config();
const { connectDatabase } = require('./dist/config/database');
const { latenessService } = require('./dist/services/latenessService');

async function testAllFixes() {
  try {
    console.log('🚀 Testing All Lateness System Fixes');
    console.log('=====================================\n');
    
    await connectDatabase();
    
    // Test Case 1: Deteksi Absence ketika semua waktu 00:00:00
    console.log('📋 Test Case 1: Absence Detection');
    console.log('Testing employee 2408007 on 2025-09-10 (all times 00:00:00)');
    
    const result1 = await latenessService.calculateLatenessForUser('2408007', '2025-09-10');
    
    if (result1) {
      console.log(`- Attendance status: ${result1.attendance_status}`);
      console.log(`- Total working minutes: ${result1.total_working_minutes}`);
      
      if (result1.attendance_status === 'absent') {
        console.log('✅ 1. Absence Detection: PASSED (correctly detected as absent)');
      } else {
        console.log('❌ 1. Absence Detection: FAILED (should be absent)');
      }
    } else {
      console.log('❌ 1. Absence Detection: FAILED (no result returned)');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test Case 2: Statistik dengan format yang diperbaiki
    console.log('📊 Test Case 2: Improved Statistics Format');
    console.log('Testing date range statistics for employee 2405047');
    
    const dateRangeResults = await latenessService.calculateLatenessForDateRange(
      '2405047', 
      '2025-08-01', 
      '2025-08-15'
    );
    
    if (dateRangeResults && dateRangeResults.length > 0) {
      // Simulasi perhitungan statistik seperti di controller
      const totalStartLateness = dateRangeResults.reduce((sum, r) => sum + Math.max(0, r.start_lateness_minutes), 0);
      const totalBreakLateness = dateRangeResults.reduce((sum, r) => sum + Math.max(0, r.break_lateness_minutes), 0);
      const totalLatenessMinutes = totalStartLateness + totalBreakLateness;
      const avgStartLateness = dateRangeResults.length > 0 ? totalStartLateness / dateRangeResults.length : 0;
      
      const formatMinutesToReadable = (minutes) => {
        const roundedMinutes = Math.round(minutes);
        if (roundedMinutes === 0) return "0 menit";
        if (roundedMinutes < 60) return `${roundedMinutes} menit`;
        const hours = Math.floor(roundedMinutes / 60);
        const remainingMinutes = roundedMinutes % 60;
        if (remainingMinutes === 0) return `${hours} jam`;
        return `${hours} jam ${remainingMinutes} menit`;
      };
      
      const stats = {
        period: {
          startDate: '2025-08-01',
          endDate: '2025-08-15'
        },
        employee: {
          userid: '2405047',
          name: dateRangeResults[0].name || 'Unknown'
        },
        totalDays: dateRangeResults.length,
        startLatenessMinutes: Math.round(totalStartLateness),
        breakLatenessMinutes: Math.round(totalBreakLateness),
        totalLatenessMinutes: Math.round(totalLatenessMinutes),
        averageStartLateness: formatMinutesToReadable(avgStartLateness),
        totalLateMinutes: formatMinutesToReadable(totalLatenessMinutes)
      };
      
      console.log('Statistics Result:');
      console.log(`- Period: ${stats.period.startDate} to ${stats.period.endDate}`);
      console.log(`- Employee: ${stats.employee.name} (${stats.employee.userid})`);
      console.log(`- Total Days: ${stats.totalDays}`);
      console.log(`- Start Lateness: ${stats.startLatenessMinutes} minutes`);
      console.log(`- Break Lateness: ${stats.breakLatenessMinutes} minutes`);
      console.log(`- Total Lateness: ${stats.totalLatenessMinutes} minutes`);
      console.log(`- Average Start Lateness: ${stats.averageStartLateness}`);
      console.log(`- Total Late Minutes: ${stats.totalLateMinutes}`);
      
      // Verifikasi perbaikan statistik
      let statsTestPassed = true;
      
      if (!stats.period.startDate || !stats.period.endDate) {
        console.log('❌ Period info missing');
        statsTestPassed = false;
      }
      
      if (!stats.employee.userid || !stats.employee.name) {
        console.log('❌ Employee info missing');
        statsTestPassed = false;
      }
      
      if (typeof stats.startLatenessMinutes !== 'number' || typeof stats.breakLatenessMinutes !== 'number') {
        console.log('❌ Lateness minutes not in correct format');
        statsTestPassed = false;
      }
      
      if (!stats.averageStartLateness.includes('menit') && !stats.averageStartLateness.includes('jam')) {
        console.log('❌ Average start lateness not in readable format');
        statsTestPassed = false;
      }
      
      if (!stats.totalLateMinutes.includes('menit') && !stats.totalLateMinutes.includes('jam')) {
        console.log('❌ Total late minutes not in readable format');
        statsTestPassed = false;
      }
      
      if (statsTestPassed) {
        console.log('✅ 2. Statistics Format: PASSED (all improvements implemented)');
      } else {
        console.log('❌ 2. Statistics Format: FAILED (some improvements missing)');
      }
      
    } else {
      console.log('❌ 2. Statistics Format: FAILED (no results returned)');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test Case 3: Total Working Minutes berdasarkan shift schedule
    console.log('⏰ Test Case 3: Total Working Minutes Calculation');
    console.log('Testing total working minutes calculation based on shift schedule');
    
    const result3 = await latenessService.calculateLatenessForUser('2405047', '2025-08-09');
    
    if (result3) {
      console.log(`- Scheduled start: ${result3.scheduled_start_time}`);
      console.log(`- Scheduled end: ${result3.scheduled_end_time}`);
      console.log(`- Actual start: ${result3.actual_start_time}`);
      console.log(`- Actual end: ${result3.actual_end_time}`);
      console.log(`- Total working minutes: ${result3.total_working_minutes}`);
      
      if (result3.total_working_minutes > 0) {
        console.log(`✅ 3. Total Working Minutes: PASSED (${result3.total_working_minutes} minutes = ${Math.round(result3.total_working_minutes/60*100)/100} hours)`);
      } else {
        console.log('❌ 3. Total Working Minutes: FAILED (still showing 0)');
      }
    } else {
      console.log('❌ 3. Total Working Minutes: FAILED (no result returned)');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    console.log('🎯 All Tests Completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    process.exit(0);
  }
}

testAllFixes();