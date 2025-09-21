const mongoose = require('mongoose');
require('dotenv').config();

// Import service
const { latenessService } = require('./dist/services/latenessService');

async function testFixedLateness() {
  try {
    // Connect to database
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database:', mongoose.connection.db.databaseName);

    console.log('\n=== Testing Fixed Lateness Calculation ===');
    console.log('Employee: 2405047 (Anggi firmansyah)');
    console.log('Date: 2025-08-09');
    console.log('Expected: Shift 11 should use 11:00-21:00 schedule');
    console.log('\n' + '='.repeat(50));

    // Test the specific case mentioned by user
    const result = await latenessService.calculateLatenessForUser('2405047', '2025-08-09');
    
    if (result) {
      console.log('\n✅ Lateness calculation result:');
      console.log(JSON.stringify(result, null, 2));
      
      // Verify the fix
      console.log('\n🔍 Verification:');
      console.log(`- Shift: ${result.shift}`);
      console.log(`- Scheduled start time: ${result.scheduled_start_time}`);
      console.log(`- Scheduled end time: ${result.scheduled_end_time}`);
      console.log(`- Actual start time: ${result.actual_start_time}`);
      console.log(`- Start lateness: ${result.start_lateness_minutes.toFixed(2)} minutes`);
      console.log(`- Attendance status: ${result.attendance_status}`);
      
      // Check if the fix worked
      if (result.scheduled_start_time === '11:00:00' && result.scheduled_end_time === '21:00:00') {
        console.log('\n🎉 SUCCESS: Shift 11 now correctly uses 11:00-21:00 schedule!');
        
        // Calculate expected lateness manually
        if (result.actual_start_time) {
          const scheduledStart = new Date(`2025-08-09T${result.scheduled_start_time}`);
          const actualStart = new Date(`2025-08-09T${result.actual_start_time}`);
          const expectedLateness = (actualStart - scheduledStart) / (1000 * 60); // in minutes
          
          console.log(`\n📊 Manual verification:`);
          console.log(`- Scheduled: ${result.scheduled_start_time}`);
          console.log(`- Actual: ${result.actual_start_time}`);
          console.log(`- Expected lateness: ${expectedLateness.toFixed(2)} minutes`);
          console.log(`- Calculated lateness: ${result.start_lateness_minutes.toFixed(2)} minutes`);
          
          if (Math.abs(expectedLateness - result.start_lateness_minutes) < 0.1) {
            console.log('✅ Lateness calculation is correct!');
          } else {
            console.log('❌ Lateness calculation mismatch!');
          }
        }
      } else {
        console.log('\n❌ FAILED: Shift 11 still using wrong schedule');
        console.log(`Expected: 11:00:00 - 21:00:00`);
        console.log(`Got: ${result.scheduled_start_time} - ${result.scheduled_end_time}`);
      }
    } else {
      console.log('❌ No result returned');
    }

    // Test a few more dates to ensure consistency
    console.log('\n' + '='.repeat(50));
    console.log('\n🔄 Testing other shift numbers for consistency...');
    
    const testCases = [
      { date: '2025-01-01', expectedShift: '9', expectedStart: '09:00:00' },
      { date: '2025-01-04', expectedShift: '7', expectedStart: '07:00:00' },
      { date: '2025-01-05', expectedShift: '7', expectedStart: '07:00:00' }
    ];
    
    for (const testCase of testCases) {
      try {
        const testResult = await latenessService.calculateLatenessForUser('2405047', testCase.date);
        if (testResult) {
          const isCorrect = testResult.scheduled_start_time === testCase.expectedStart;
          console.log(`\n${isCorrect ? '✅' : '❌'} ${testCase.date}: Shift ${testCase.expectedShift} -> ${testResult.scheduled_start_time} (expected: ${testCase.expectedStart})`);
        } else {
          console.log(`\n⚠️  ${testCase.date}: No result (might be OFF day)`);
        }
      } catch (error) {
        console.log(`\n❌ ${testCase.date}: Error - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
    console.log('\n🏁 Test completed!');
  }
}

testFixedLateness();