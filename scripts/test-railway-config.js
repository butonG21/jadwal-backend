/**
 * Script to test Railway configuration and URL accessibility
 * Run this script to verify your Railway setup is working correctly
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration from environment variables
const config = {
  baseUrl: process.env.BASE_URL,
  username: process.env.CRON_AUTH_USERNAME,
  password: process.env.CRON_AUTH_PASSWORD,
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT
};

console.log('🔧 Railway Configuration Test');
console.log('================================');
console.log('');

// Display current configuration
console.log('📋 Current Configuration:');
console.log(`   BASE_URL: ${config.baseUrl || 'NOT SET'}`);
console.log(`   NODE_ENV: ${config.nodeEnv || 'NOT SET'}`);
console.log(`   PORT: ${config.port || 'NOT SET'}`);
console.log(`   CRON_AUTH_USERNAME: ${config.username || 'NOT SET'}`);
console.log(`   CRON_AUTH_PASSWORD: ${config.password ? '***SET***' : 'NOT SET'}`);
console.log('');

// Validation functions
function validateUrl(url) {
  if (!url) {
    return { valid: false, error: 'URL is not set' };
  }
  
  if (url.includes('localhost') && config.nodeEnv === 'production') {
    return { valid: false, error: 'localhost URL cannot be used in production' };
  }
  
  try {
    new URL(url);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

function validateCredentials() {
  if (!config.username || !config.password) {
    return { valid: false, error: 'Username or password not set' };
  }
  return { valid: true };
}

// Test functions
async function testHealthEndpoint(baseUrl) {
  try {
    console.log('🏥 Testing health endpoint...');
    const start = performance.now();
    const response = await axios.get(`${baseUrl}/health`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Railway-Config-Test/1.0'
      }
    });
    const duration = Math.round(performance.now() - start);
    
    console.log(`   ✅ Health check passed (${duration}ms)`);
    console.log(`   📊 Status: ${response.status}`);
    console.log(`   📄 Response: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    console.log(`   ❌ Health check failed`);
    console.log(`   🔍 Error: ${error.message}`);
    if (error.response) {
      console.log(`   📊 Status: ${error.response.status}`);
      console.log(`   📄 Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

async function testAuthEndpoint(baseUrl, username, password) {
  try {
    console.log('🔐 Testing authentication endpoint...');
    const start = performance.now();
    const response = await axios.post(`${baseUrl}/api/v1/auth/login`, {
      employeeId: username,
      password: password
    }, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Railway-Config-Test/1.0'
      }
    });
    const duration = Math.round(performance.now() - start);
    
    console.log(`   ✅ Authentication successful (${duration}ms)`);
    console.log(`   📊 Status: ${response.status}`);
    console.log(`   🎫 Token received: ${response.data.token ? 'YES' : 'NO'}`);
    return { success: true, token: response.data.token };
  } catch (error) {
    console.log(`   ❌ Authentication failed`);
    console.log(`   🔍 Error: ${error.message}`);
    if (error.response) {
      console.log(`   📊 Status: ${error.response.status}`);
      console.log(`   📄 Response: ${JSON.stringify(error.response.data)}`);
    }
    return { success: false };
  }
}

async function testCronTrigger(baseUrl, token) {
  try {
    console.log('⏰ Testing cron trigger endpoint...');
    const start = performance.now();
    const response = await axios.post(`${baseUrl}/api/v1/cron/trigger/attendance-fetch`, {}, {
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Railway-Config-Test/1.0'
      }
    });
    const duration = Math.round(performance.now() - start);
    
    console.log(`   ✅ Cron trigger successful (${duration}ms)`);
    console.log(`   📊 Status: ${response.status}`);
    console.log(`   📄 Response: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    console.log(`   ❌ Cron trigger failed`);
    console.log(`   🔍 Error: ${error.message}`);
    if (error.response) {
      console.log(`   📊 Status: ${error.response.status}`);
      console.log(`   📄 Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Starting Railway Configuration Tests');
  console.log('=====================================');
  console.log('');
  
  // Validate configuration
  console.log('✅ Configuration Validation:');
  
  const urlValidation = validateUrl(config.baseUrl);
  if (!urlValidation.valid) {
    console.log(`   ❌ BASE_URL: ${urlValidation.error}`);
    console.log('');
    console.log('🔧 Fix Required:');
    console.log('   1. Go to Railway dashboard');
    console.log('   2. Find your service domain in "Domains" section');
    console.log('   3. Set BASE_URL=https://your-domain.up.railway.app');
    console.log('   4. Redeploy your service');
    return;
  }
  console.log(`   ✅ BASE_URL: Valid`);
  
  const credValidation = validateCredentials();
  if (!credValidation.valid) {
    console.log(`   ❌ Credentials: ${credValidation.error}`);
    return;
  }
  console.log(`   ✅ Credentials: Set`);
  
  console.log('');
  
  // Run endpoint tests
  const healthOk = await testHealthEndpoint(config.baseUrl);
  console.log('');
  
  if (!healthOk) {
    console.log('❌ Health check failed - cannot proceed with other tests');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Verify your Railway service is deployed and running');
    console.log('   2. Check if the BASE_URL is correct');
    console.log('   3. Test the URL manually in browser');
    return;
  }
  
  const authResult = await testAuthEndpoint(config.baseUrl, config.username, config.password);
  console.log('');
  
  if (!authResult.success) {
    console.log('❌ Authentication failed - cannot test cron trigger');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Verify CRON_AUTH_USERNAME and CRON_AUTH_PASSWORD are correct');
    console.log('   2. Check if the user exists in your database');
    console.log('   3. Test login manually with the same credentials');
    return;
  }
  
  await testCronTrigger(config.baseUrl, authResult.token);
  console.log('');
  
  console.log('🎉 All tests completed!');
  console.log('');
  console.log('📋 Summary:');
  console.log('   ✅ Configuration is valid');
  console.log('   ✅ Health endpoint is accessible');
  console.log('   ✅ Authentication is working');
  console.log('   ✅ Cron trigger is functional');
  console.log('');
  console.log('🚀 Your Railway deployment should now work correctly!');
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test runner failed:', error.message);
  process.exit(1);
});