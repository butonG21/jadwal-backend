const mongoose = require('mongoose');
require('dotenv').config();

async function debugScheduleStructure() {
  try {
    // Connect to database
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database:', mongoose.connection.db.databaseName);

    // Get schedules collection
    const db = mongoose.connection.db;
    const schedulesCollection = db.collection('schedules');

    // Find employee 2405047 schedule for 2025-08-09
    const employee = await schedulesCollection.findOne(
      { employee_id: '2405047' },
      { projection: { name: 1, employee_id: 1, schedule: { $slice: 5 } } }
    );

    console.log('\n=== Employee 2405047 Schedule Sample ===');
    console.log(JSON.stringify(employee, null, 2));

    // Find specific date schedule
    const specificDate = await schedulesCollection.findOne(
      { 
        employee_id: '2405047',
        'schedule.date': '2025-08-09'
      },
      { 
        projection: { 
          name: 1, 
          employee_id: 1, 
          'schedule.$': 1 
        } 
      }
    );

    console.log('\n=== Schedule for 2025-08-09 ===');
    console.log(JSON.stringify(specificDate, null, 2));

    // Check if there are any documents with start_time/end_time fields
    const sampleWithTimes = await schedulesCollection.findOne(
      {},
      { projection: { schedule: { $slice: 1 } } }
    );

    console.log('\n=== Sample Schedule Structure ===');
    if (sampleWithTimes && sampleWithTimes.schedule && sampleWithTimes.schedule[0]) {
      console.log('Schedule item fields:', Object.keys(sampleWithTimes.schedule[0]));
      console.log('Sample schedule item:', JSON.stringify(sampleWithTimes.schedule[0], null, 2));
    }

    // Check if there's a separate shifts collection or similar
    const collections = await db.listCollections().toArray();
    console.log('\n=== Available Collections ===');
    collections.forEach(col => {
      console.log(`- ${col.name}`);
    });

    // Check if there's any collection that might contain shift time definitions
    const shiftCollections = collections.filter(col => 
      col.name.toLowerCase().includes('shift') || 
      col.name.toLowerCase().includes('time') ||
      col.name.toLowerCase().includes('work')
    );

    if (shiftCollections.length > 0) {
      console.log('\n=== Potential Shift-related Collections ===');
      for (const col of shiftCollections) {
        console.log(`\nCollection: ${col.name}`);
        const sample = await db.collection(col.name).findOne({});
        if (sample) {
          console.log('Sample document:', JSON.stringify(sample, null, 2));
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

debugScheduleStructure();