/**
 * Script to help determine the correct Railway URL for your deployment
 * Run this script in your Railway environment to get the correct URL
 */

console.log('=== Railway Environment Variables Debug ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('');

console.log('=== Railway URL Variables ===');
console.log('RAILWAY_STATIC_URL:', process.env.RAILWAY_STATIC_URL);
console.log('RAILWAY_PUBLIC_DOMAIN:', process.env.RAILWAY_PUBLIC_DOMAIN);
console.log('RAILWAY_DOMAIN:', process.env.RAILWAY_DOMAIN);
console.log('RAILWAY_PROJECT_DOMAIN:', process.env.RAILWAY_PROJECT_DOMAIN);
console.log('');

console.log('=== Railway Project Info ===');
console.log('RAILWAY_PROJECT_ID:', process.env.RAILWAY_PROJECT_ID);
console.log('RAILWAY_SERVICE_ID:', process.env.RAILWAY_SERVICE_ID);
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('');

console.log('=== Current Configuration ===');
console.log('BASE_URL:', process.env.BASE_URL);
console.log('');

// Try to determine the correct URL
function determineRailwayUrl() {
  const possibleUrls = [
    process.env.RAILWAY_STATIC_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN,
    process.env.RAILWAY_DOMAIN,
    process.env.RAILWAY_PROJECT_DOMAIN
  ];

  for (const url of possibleUrls) {
    if (url && url.trim()) {
      const cleanUrl = url.trim();
      const formattedUrl = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
      console.log('✅ Found Railway URL:', formattedUrl);
      return formattedUrl;
    }
  }

  // Try to construct from project info
  if (process.env.RAILWAY_PROJECT_ID && process.env.RAILWAY_SERVICE_ID) {
    const constructedUrl = `https://${process.env.RAILWAY_SERVICE_ID}-${process.env.RAILWAY_PROJECT_ID}.up.railway.app`;
    console.log('🔧 Constructed URL from project info:', constructedUrl);
    return constructedUrl;
  }

  console.log('❌ No Railway URL found');
  return null;
}

const railwayUrl = determineRailwayUrl();

if (railwayUrl) {
  console.log('');
  console.log('=== RECOMMENDED ACTION ===');
  console.log('Set this environment variable in Railway:');
  console.log(`BASE_URL=${railwayUrl}`);
  console.log('');
  console.log('Or use one of these Railway-specific variables if available:');
  if (process.env.RAILWAY_STATIC_URL) {
    console.log(`RAILWAY_STATIC_URL=${process.env.RAILWAY_STATIC_URL}`);
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    console.log(`RAILWAY_PUBLIC_DOMAIN=${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  }
} else {
  console.log('');
  console.log('=== MANUAL CONFIGURATION NEEDED ===');
  console.log('Please check your Railway dashboard for the correct public URL');
  console.log('Then set the BASE_URL environment variable accordingly.');
  console.log('');
  console.log('Example:');
  console.log('BASE_URL=https://your-app-name.up.railway.app');
}

console.log('');
console.log('=== Testing URL ===');
if (railwayUrl) {
  console.log(`Test your URL: ${railwayUrl}/health`);
  console.log(`API endpoint: ${railwayUrl}/api/v1/auth/login`);
}