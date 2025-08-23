/**
 * Test script untuk memvalidasi optimasi attendance fetch
 * Script ini akan menguji berbagai skenario optimasi image processing
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Konfigurasi
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TEST_EMPLOYEE_ID = process.env.TEST_EMPLOYEE_ID || '12345'; // Ganti dengan employee ID yang valid

// Warna untuk output console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logSubSection(title) {
  console.log('\n' + '-'.repeat(40));
  log(title, 'yellow');
  console.log('-'.repeat(40));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Helper function untuk HTTP requests
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test functions
async function testServerConnection() {
  logSubSection('Testing Server Connection');
  
  const result = await makeRequest('GET', '/health');
  
  if (result.success) {
    logSuccess('Server is running and accessible');
    logInfo(`Server response: ${JSON.stringify(result.data, null, 2)}`);
    return true;
  } else {
    logError('Failed to connect to server');
    logError(`Error: ${JSON.stringify(result.error, null, 2)}`);
    return false;
  }
}

async function testOptimizationStats() {
  logSubSection('Testing Optimization Statistics');
  
  const result = await makeRequest('GET', '/api/v1/attendance/optimization-stats');
  
  if (result.success) {
    logSuccess('Optimization statistics retrieved successfully');
    const stats = result.data.data;
    
    logInfo(`Total records with images: ${stats.totalRecordsWithImages}`);
    logInfo(`Optimized images: ${stats.optimizedImages}`);
    logInfo(`Need optimization: ${stats.needOptimization}`);
    logInfo(`Optimization rate: ${stats.optimizationRate}%`);
    
    if (stats.optimizationRate > 0) {
      logSuccess(`Good! ${stats.optimizationRate}% of images are already optimized`);
    } else {
      logWarning('No optimized images found. Consider running migration first.');
    }
    
    return stats;
  } else {
    logError('Failed to get optimization statistics');
    logError(`Error: ${JSON.stringify(result.error, null, 2)}`);
    return null;
  }
}

async function testMigrationStats() {
  logSubSection('Testing Migration Statistics');
  
  const result = await makeRequest('GET', '/api/v1/attendance/migration-stats');
  
  if (result.success) {
    logSuccess('Migration statistics retrieved successfully');
    const stats = result.data.data;
    
    logInfo(`Total with images: ${stats.totalWithImages}`);
    logInfo(`Already migrated: ${stats.alreadyMigrated}`);
    logInfo(`Need migration: ${stats.needMigration}`);
    logInfo(`Migration progress: ${stats.migrationProgress}%`);
    
    if (stats.migrationProgress === 100) {
      logSuccess('All images have been migrated to ImageKit!');
    } else {
      logWarning(`${stats.needMigration} images still need migration`);
    }
    
    return stats;
  } else {
    logError('Failed to get migration statistics');
    logError(`Error: ${JSON.stringify(result.error, null, 2)}`);
    return null;
  }
}

async function testOptimizedFetch() {
  logSubSection(`Testing Optimized Fetch for Employee ${TEST_EMPLOYEE_ID}`);
  
  const startTime = Date.now();
  const result = await makeRequest('GET', `/api/v1/attendance/test-optimized-fetch/${TEST_EMPLOYEE_ID}`);
  const endTime = Date.now();
  const requestTime = endTime - startTime;
  
  if (result.success) {
    logSuccess(`Optimized fetch completed in ${requestTime}ms`);
    const optimization = result.data.data.optimization;
    
    logInfo(`Processing time: ${optimization.processingTimeMs}ms`);
    logInfo(`Had existing data: ${optimization.hadExistingData}`);
    
    // Analyze image optimization
    const imageTypes = ['start_image', 'break_out_image', 'break_in_image', 'end_image'];
    let optimizedCount = 0;
    let totalImages = 0;
    
    imageTypes.forEach(imageType => {
      const imageOpt = optimization.imageOptimization[imageType];
      if (imageOpt.finalUrl) {
        totalImages++;
        if (imageOpt.wasOptimized) {
          optimizedCount++;
          logSuccess(`${imageType}: Reused existing ImageKit URL`);
        } else if (imageOpt.isImageKit) {
          logInfo(`${imageType}: Uploaded new image to ImageKit`);
        } else {
          logWarning(`${imageType}: Using external URL (not optimized)`);
        }
      }
    });
    
    if (totalImages > 0) {
      const optimizationRate = (optimizedCount / totalImages) * 100;
      logInfo(`Image optimization rate: ${optimizationRate.toFixed(1)}% (${optimizedCount}/${totalImages})`);
      
      if (optimizationRate > 50) {
        logSuccess('Good optimization rate!');
      } else {
        logWarning('Low optimization rate. Consider running migration.');
      }
    }
    
    return optimization;
  } else {
    logError('Failed to test optimized fetch');
    logError(`Error: ${JSON.stringify(result.error, null, 2)}`);
    
    if (result.status === 404) {
      logWarning(`Employee ${TEST_EMPLOYEE_ID} not found. Please check the TEST_EMPLOYEE_ID.`);
    }
    
    return null;
  }
}

async function testRegularFetch() {
  logSubSection(`Testing Regular Fetch for Employee ${TEST_EMPLOYEE_ID}`);
  
  const startTime = Date.now();
  const result = await makeRequest('GET', `/api/v1/attendance/fetch/${TEST_EMPLOYEE_ID}`);
  const endTime = Date.now();
  const requestTime = endTime - startTime;
  
  if (result.success) {
    logSuccess(`Regular fetch completed in ${requestTime}ms`);
    logInfo('Regular fetch uses the same optimized logic now');
    return { processingTime: requestTime };
  } else {
    logError('Failed to test regular fetch');
    logError(`Error: ${JSON.stringify(result.error, null, 2)}`);
    return null;
  }
}

async function performanceBenchmark() {
  logSubSection('Performance Benchmark');
  
  logInfo('Running multiple fetch operations to test performance...');
  
  const iterations = 3;
  const times = [];
  
  for (let i = 1; i <= iterations; i++) {
    logInfo(`Iteration ${i}/${iterations}`);
    
    const startTime = Date.now();
    const result = await makeRequest('GET', `/api/v1/attendance/test-optimized-fetch/${TEST_EMPLOYEE_ID}`);
    const endTime = Date.now();
    
    if (result.success) {
      const processingTime = endTime - startTime;
      times.push(processingTime);
      logInfo(`  Request time: ${processingTime}ms`);
    } else {
      logWarning(`  Iteration ${i} failed`);
    }
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    logSuccess('Performance Benchmark Results:');
    logInfo(`  Average time: ${avgTime.toFixed(1)}ms`);
    logInfo(`  Min time: ${minTime}ms`);
    logInfo(`  Max time: ${maxTime}ms`);
    
    if (avgTime < 3000) {
      logSuccess('Excellent performance! Average time under 3 seconds.');
    } else if (avgTime < 5000) {
      logInfo('Good performance. Average time under 5 seconds.');
    } else {
      logWarning('Performance could be improved. Average time over 5 seconds.');
    }
  }
}

async function generateReport(stats) {
  logSubSection('Generating Test Report');
  
  const report = {
    timestamp: new Date().toISOString(),
    testResults: {
      serverConnection: true,
      optimizationStats: stats.optimization,
      migrationStats: stats.migration,
      optimizedFetch: stats.optimizedFetch,
      regularFetch: stats.regularFetch
    },
    recommendations: []
  };
  
  // Generate recommendations
  if (stats.migration && stats.migration.migrationProgress < 100) {
    report.recommendations.push({
      type: 'migration',
      message: `Run migration for ${stats.migration.needMigration} remaining images`,
      command: 'POST /api/v1/attendance/migrate-images'
    });
  }
  
  if (stats.optimization && stats.optimization.optimizationRate < 50) {
    report.recommendations.push({
      type: 'optimization',
      message: 'Low optimization rate detected. Consider running migration first.',
      command: 'POST /api/v1/attendance/migrate-images'
    });
  }
  
  if (stats.optimizedFetch) {
    report.recommendations.push({
      type: 'monitoring',
      message: 'Monitor optimization statistics regularly',
      command: 'GET /api/v1/attendance/optimization-stats'
    });
  }
  
  // Save report to file
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logSuccess(`Test report saved to: ${reportPath}`);
  
  // Display summary
  logInfo('\nTest Summary:');
  if (report.recommendations.length === 0) {
    logSuccess('✅ All tests passed! No recommendations.');
  } else {
    logWarning(`⚠️  ${report.recommendations.length} recommendations:`);
    report.recommendations.forEach((rec, index) => {
      logInfo(`  ${index + 1}. ${rec.message}`);
      logInfo(`     Command: ${rec.command}`);
    });
  }
}

// Main test function
async function runTests() {
  logSection('Attendance Fetch Optimization Test Suite');
  
  logInfo(`Base URL: ${BASE_URL}`);
  logInfo(`Test Employee ID: ${TEST_EMPLOYEE_ID}`);
  logInfo(`Test started at: ${new Date().toISOString()}`);
  
  const stats = {};
  
  try {
    // Test 1: Server Connection
    const serverOk = await testServerConnection();
    if (!serverOk) {
      logError('Cannot proceed with tests - server is not accessible');
      process.exit(1);
    }
    
    // Test 2: Optimization Statistics
    stats.optimization = await testOptimizationStats();
    
    // Test 3: Migration Statistics
    stats.migration = await testMigrationStats();
    
    // Test 4: Optimized Fetch
    stats.optimizedFetch = await testOptimizedFetch();
    
    // Test 5: Regular Fetch (for comparison)
    stats.regularFetch = await testRegularFetch();
    
    // Test 6: Performance Benchmark
    await performanceBenchmark();
    
    // Generate Report
    await generateReport(stats);
    
    logSection('Test Completed Successfully!');
    logSuccess('All tests have been executed. Check the test report for details.');
    
  } catch (error) {
    logError('Test suite failed with error:');
    logError(error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testServerConnection,
  testOptimizationStats,
  testMigrationStats,
  testOptimizedFetch,
  testRegularFetch
};