require('dotenv').config();
const mongoose = require('mongoose');
const { LatenessService } = require('./dist/services/latenessService');
const { connectDatabase } = require('./dist/config/database');
const logger = require('./dist/utils/loggers');

async function testImprovedLateness() {
  try {
    // Koneksi ke database
    await connectDatabase();
    console.log('✅ Connected to database');
    
    const latenessService = new LatenessService();
    
    console.log('\n🧪 Testing improved lateness calculation...');
    console.log('=' .repeat(60));
    
    // Test case 1: Employee 2405047 pada 2025-08-09 (shift 11)
    console.log('\n📋 Test Case 1: Employee 2405047 - 2025-08-09 (Shift 11)');
    console.log('-'.repeat(50));
    
    const result1 = await latenessService.calculateLatenessForUser('2405047', '2025-08-09');
    
    if (result1) {
      console.log('\n✅ Lateness calculation result:');
      console.log(JSON.stringify(result1, null, 2));
      
      console.log('\n🔍 Verification:');
      console.log(`- Shift: ${result1.shift}`);
      console.log(`- Scheduled start: ${result1.scheduled_start_time}`);
      console.log(`- Actual start: ${result1.actual_start_time}`);
      console.log(`- Start lateness: ${result1.start_lateness_minutes} minutes`);
      console.log(`- Start lateness display: ${result1.start_lateness_display}`);
      console.log(`- End lateness: ${result1.end_lateness_minutes} minutes`);
      console.log(`- End lateness display: ${result1.end_lateness_display}`);
      console.log(`- Break lateness: ${result1.break_lateness_minutes} minutes`);
      console.log(`- Break lateness display: ${result1.break_lateness_display}`);
      console.log(`- Total working minutes: ${result1.total_working_minutes}`);
      console.log(`- Attendance status: ${result1.attendance_status}`);
      
      // Verifikasi perbaikan
      console.log('\n🎯 Verification of fixes:');
      
      // 1. Toleransi 1 menit
      if (result1.start_lateness_minutes === 0 && result1.actual_start_time === '10:58:47') {
        console.log('✅ 1. Toleransi 1 menit: PASSED (datang 1.22 menit lebih awal dianggap tepat waktu)');
      } else {
        console.log('❌ 1. Toleransi 1 menit: FAILED');
      }
      
      // 2. Format tampilan yang mudah dibaca
      if (result1.start_lateness_display && result1.end_lateness_display && result1.break_lateness_display) {
        console.log('✅ 2. Format tampilan: PASSED');
        console.log(`   - Start: ${result1.start_lateness_display}`);
        console.log(`   - End: ${result1.end_lateness_display}`);
        console.log(`   - Break: ${result1.break_lateness_display}`);
      } else {
        console.log('❌ 2. Format tampilan: FAILED');
      }
      
      // 3. Total working minutes tidak 0
      if (result1.total_working_minutes > 0) {
        console.log(`✅ 3. Total working minutes: PASSED (${result1.total_working_minutes} minutes = ${Math.round(result1.total_working_minutes/60*100)/100} hours)`);
      } else {
        console.log('❌ 3. Total working minutes: FAILED (still showing 0)');
      }
      
    } else {
      console.log('❌ No lateness data found for employee 2405047 on 2025-08-09');
    }
    
    // Test case 2: Employee 2405047 pada 2025-09-09 (shift Siang) - untuk test break lateness
    console.log('\n\n📋 Test Case 2: Employee 2405047 - 2025-09-09 (Shift Siang)');
    console.log('-'.repeat(50));
    
    const result2 = await latenessService.calculateLatenessForUser('2405047', '2025-09-09');
    
    if (result2) {
      console.log('\n✅ Lateness calculation result:');
      console.log(JSON.stringify(result2, null, 2));
      
      console.log('\n🔍 Break Analysis:');
      console.log(`- Break out: ${result2.actual_break_out_time}`);
      console.log(`- Break in: ${result2.actual_break_in_time}`);
      console.log(`- Break duration: ${result2.break_lateness_minutes + 60} minutes (${result2.break_lateness_display})`);
      console.log(`- Allowed break: 60 minutes`);
      console.log(`- Break lateness: ${result2.break_lateness_minutes} minutes (${result2.break_lateness_display})`);
      console.log(`- Break status: ${result2.break_status}`);
      
      // Verifikasi break lateness
      if (result2.break_lateness_minutes > 0) {
        console.log('✅ 4. Break lateness calculation: PASSED (correctly detected break overtime)');
      } else {
        console.log('❌ 4. Break lateness calculation: FAILED (should detect break overtime)');
      }
      
    } else {
      console.log('❌ No lateness data found for employee 2405047 on 2025-09-09');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 Test completed!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    // Tutup koneksi database
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Jalankan test
testImprovedLateness();